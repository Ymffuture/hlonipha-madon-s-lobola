CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.attendance_status AS ENUM ('attending','not_attending','undecided');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Auto-grant admin to the designated admin email
CREATE OR REPLACE FUNCTION public.grant_designated_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'futurekgomotso@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_admin AFTER INSERT OR UPDATE OF email_confirmed_at, email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_designated_admin();
INSERT INTO public.user_roles(user_id, role)
SELECT id, 'admin' FROM auth.users WHERE lower(email)='futurekgomotso@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Event settings (single row, public read)
CREATE TABLE public.event_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  couple_names text NOT NULL DEFAULT 'Hlonipha & Madon',
  monogram text NOT NULL DEFAULT 'H & M',
  event_name text NOT NULL DEFAULT 'Lobola Luncheon',
  event_datetime timestamptz NOT NULL DEFAULT '2026-12-22 10:30:00+02',
  venue text NOT NULL DEFAULT 'Xihoko Village, Tzaneen, South Africa',
  dress_code text NOT NULL DEFAULT 'Traditional Xitsonga Attire',
  rsvp_contact text NOT NULL DEFAULT '078 326 4716',
  welcome_message text NOT NULL DEFAULT 'With joyful hearts, our families invite you to celebrate the union of Hlonipha and Madon. Come as we honour love, family and the traditions of our ancestors — an afternoon of ululation, xibelani, song and shared blessings as two families become one.',
  hero_video_url text,
  max_guests int NOT NULL DEFAULT 5 CHECK (max_guests BETWEEN 1 AND 50),
  color_ivory text NOT NULL DEFAULT '#F8F0DF',
  color_brown text NOT NULL DEFAULT '#4B2A18',
  color_gold text NOT NULL DEFAULT '#B87924',
  color_beige text NOT NULL DEFAULT '#E9DCC8',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_settings TO anon, authenticated;
GRANT UPDATE ON public.event_settings TO authenticated;
GRANT ALL ON public.event_settings TO service_role;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads event settings" ON public.event_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update event settings" ON public.event_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.event_settings (id) VALUES (1);

-- RSVPs
CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 20),
  phone_normalized text NOT NULL UNIQUE,
  email text CHECK (email IS NULL OR char_length(email) <= 255),
  attendance public.attendance_status NOT NULL,
  guest_count int NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 0 AND 50),
  additional_guests text CHECK (additional_guests IS NULL OR char_length(additional_guests) <= 1000),
  dietary text CHECK (dietary IS NULL OR char_length(dietary) <= 500),
  accessibility text CHECK (accessibility IS NULL OR char_length(accessibility) <= 500),
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.rsvps TO authenticated;
GRANT ALL ON public.rsvps TO service_role;
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rsvps" ON public.rsvps FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update rsvps" ON public.rsvps FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete rsvps" ON public.rsvps FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER rsvps_touch BEFORE UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.event_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Restricted public submission: validates, prevents duplicates, returns only the new id
CREATE OR REPLACE FUNCTION public.submit_rsvp(
  _full_name text, _phone text, _email text, _attendance public.attendance_status,
  _guest_count int, _additional_guests text, _dietary text, _accessibility text, _message text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _norm text; _max int; _id uuid; _count int;
BEGIN
  _full_name := btrim(coalesce(_full_name,''));
  _phone := btrim(coalesce(_phone,''));
  _norm := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF _norm LIKE '27%' AND char_length(_norm) = 11 THEN _norm := '0' || substr(_norm, 3); END IF;
  IF char_length(_full_name) < 2 OR char_length(_full_name) > 120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF char_length(_norm) < 9 OR char_length(_norm) > 15 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  _email := nullif(btrim(coalesce(_email,'')), '');
  IF _email IS NOT NULL AND _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  SELECT max_guests INTO _max FROM public.event_settings WHERE id = 1;
  _count := CASE WHEN _attendance = 'not_attending' THEN 0 ELSE coalesce(_guest_count, 1) END;
  IF _attendance <> 'not_attending' AND (_count < 1 OR _count > coalesce(_max,5)) THEN RAISE EXCEPTION 'INVALID_GUEST_COUNT'; END IF;
  IF EXISTS (SELECT 1 FROM public.rsvps WHERE phone_normalized = _norm) THEN RAISE EXCEPTION 'DUPLICATE_RSVP'; END IF;
  INSERT INTO public.rsvps(full_name, phone, phone_normalized, email, attendance, guest_count, additional_guests, dietary, accessibility, message)
  VALUES (_full_name, _phone, _norm, _email, _attendance, _count,
    nullif(btrim(left(coalesce(_additional_guests,''),1000)),''),
    nullif(btrim(left(coalesce(_dietary,''),500)),''),
    nullif(btrim(left(coalesce(_accessibility,''),500)),''),
    nullif(btrim(left(coalesce(_message,''),1000)),''))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.submit_rsvp(text,text,text,public.attendance_status,int,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text,text,text,public.attendance_status,int,text,text,text,text) TO anon, authenticated;