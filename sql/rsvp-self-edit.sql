-- ============================================================================
-- H & M Lobola Luncheon — Guest self-service: check status & edit RSVP
--
-- HOW TO USE: open your database SQL editor, paste this whole file and run it
-- once. It only ADDS three new functions — it does not modify or drop any
-- existing table, policy or function (submit_rsvp stays exactly as it is).
--
-- What it adds:
--   1. rsvp_ref_code(full_name, phone)  -> "HMTG-44863" style reference
--      (first letters of the name, up to 4, + last 5 digits of the phone)
--   2. lookup_rsvp(phone)               -> guest's RSVP + ref code +
--                                          edit_closed (true when the event
--                                          is less than 7 days away)
--   3. update_rsvp_self(...)            -> guest edits their own RSVP,
--                                          blocked with EDIT_WINDOW_CLOSED
--                                          once the event is within 7 days
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rsvp_ref_code(_full_name text, _phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE _norm text; _letters text; _w text;
BEGIN
  _norm := regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g');
  _letters := '';
  FOR _w IN
    SELECT upper(left(w, 1))
    FROM unnest(regexp_split_to_array(btrim(coalesce(_full_name, '')), '\s+')) AS w
    WHERE btrim(w) <> ''
  LOOP
    _letters := _letters || _w;
    EXIT WHEN char_length(_letters) >= 4;
  END LOOP;
  -- Names with no Latin initials (e.g. a single short word) fall back to the
  -- first letters of the name, then to a fixed two-letter prefix.
  IF char_length(_letters) < 2 THEN
    _letters := left(upper(regexp_replace(coalesce(_full_name, ''), '[^A-Za-z]', '', 'g')), 4);
  END IF;
  IF char_length(_letters) = 0 THEN
    _letters := 'HM';
  END IF;
  RETURN _letters || '-' || right(_norm, 5);
END $$;

-- ---------------------------------------------------------------------------
-- Look up a guest's RSVP by their registered phone number.
-- Raises NOT_FOUND / INVALID_PHONE; the website turns those into friendly
-- messages. Returns the reference code, the current answers and whether the
-- 7-day edit window is already closed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_rsvp(_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _norm text; _r public.rsvps%ROWTYPE; _event timestamptz; _closed boolean;
BEGIN
  _norm := regexp_replace(btrim(coalesce(_phone, '')), '[^0-9]', '', 'g');
  IF _norm LIKE '27%' AND char_length(_norm) = 11 THEN _norm := '0' || substr(_norm, 3); END IF;
  IF char_length(_norm) < 9 OR char_length(_norm) > 15 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  SELECT * INTO _r FROM public.rsvps WHERE phone_normalized = _norm;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT event_datetime INTO _event FROM public.event_settings WHERE id = 1;
  _closed := _event IS NOT NULL AND _event < now() + interval '7 days';
  RETURN jsonb_build_object(
    'ref_code',          public.rsvp_ref_code(_r.full_name, _r.phone),
    'full_name',         _r.full_name,
    'phone',             _r.phone,
    'email',             _r.email,
    'attendance',        _r.attendance,
    'guest_count',       _r.guest_count,
    'additional_guests', _r.additional_guests,
    'dietary',           _r.dietary,
    'accessibility',     _r.accessibility,
    'message',           _r.message,
    'created_at',        _r.created_at,
    'updated_at',        _r.updated_at,
    'edit_closed',       _closed
  );
END $$;

-- ---------------------------------------------------------------------------
-- Let a guest update their own RSVP (matched by phone number). Editing is
-- refused with EDIT_WINDOW_CLOSED once the celebration is within 7 days.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_rsvp_self(
  _phone text,
  _attendance attendance_status,
  _guest_count integer,
  _additional_guests text,
  _dietary text,
  _accessibility text,
  _message text,
  _email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _norm text; _r public.rsvps%ROWTYPE; _max int; _event timestamptz; _count int;
BEGIN
  _norm := regexp_replace(btrim(coalesce(_phone, '')), '[^0-9]', '', 'g');
  IF _norm LIKE '27%' AND char_length(_norm) = 11 THEN _norm := '0' || substr(_norm, 3); END IF;
  IF char_length(_norm) < 9 OR char_length(_norm) > 15 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  SELECT * INTO _r FROM public.rsvps WHERE phone_normalized = _norm;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT event_datetime INTO _event FROM public.event_settings WHERE id = 1;
  IF _event IS NOT NULL AND _event < now() + interval '7 days' THEN
    RAISE EXCEPTION 'EDIT_WINDOW_CLOSED';
  END IF;

  SELECT max_guests INTO _max FROM public.event_settings WHERE id = 1;
  _count := CASE WHEN _attendance = 'not_attending' THEN 0 ELSE coalesce(_guest_count, 1) END;
  IF _attendance <> 'not_attending' AND (_count < 1 OR _count > coalesce(_max, 5)) THEN
    RAISE EXCEPTION 'INVALID_GUEST_COUNT';
  END IF;
  _additional_guests := nullif(btrim(left(coalesce(_additional_guests, ''), 1000)), '');
  _message := nullif(btrim(left(coalesce(_message, ''), 1000)), '');
  IF _attendance <> 'not_attending' AND _count > 1 AND _additional_guests IS NULL THEN
    RAISE EXCEPTION 'GUEST_NAMES_REQUIRED';
  END IF;
  IF _attendance <> 'not_attending' AND _count > 1 AND _message IS NULL THEN
    RAISE EXCEPTION 'MESSAGE_REQUIRED';
  END IF;
  _email := nullif(btrim(coalesce(_email, '')), '');
  IF _email IS NOT NULL AND _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;

  UPDATE public.rsvps SET
    attendance        = _attendance,
    guest_count       = _count,
    additional_guests = _additional_guests,
    dietary           = nullif(btrim(left(coalesce(_dietary, ''), 500)), ''),
    accessibility     = nullif(btrim(left(coalesce(_accessibility, ''), 500)), ''),
    message           = _message,
    email             = _email,
    updated_at        = now()
  WHERE id = _r.id;

  SELECT * INTO _r FROM public.rsvps WHERE id = _r.id;
  RETURN jsonb_build_object(
    'ref_code',          public.rsvp_ref_code(_r.full_name, _r.phone),
    'full_name',         _r.full_name,
    'phone',             _r.phone,
    'email',             _r.email,
    'attendance',        _r.attendance,
    'guest_count',       _r.guest_count,
    'additional_guests', _r.additional_guests,
    'dietary',           _r.dietary,
    'accessibility',     _r.accessibility,
    'message',           _r.message,
    'created_at',        _r.created_at,
    'updated_at',        _r.updated_at,
    'edit_closed',       false
  );
END $$;

-- ---------------------------------------------------------------------------
-- Permissions: guests (signed-out visitors) may call the two guest functions;
-- the ref-code helper is internal. No new table policies are added and no
-- existing policy is changed.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lookup_rsvp(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_rsvp_self(text, attendance_status, integer, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_rsvp(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_rsvp_self(text, attendance_status, integer, text, text, text, text, text) TO anon, authenticated;
