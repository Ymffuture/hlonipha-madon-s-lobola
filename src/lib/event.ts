import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventSettings = Database["public"]["Tables"]["event_settings"]["Row"];
export type Rsvp = Database["public"]["Tables"]["rsvps"]["Row"];
export type Attendance = Database["public"]["Enums"]["attendance_status"];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  attending: "Attending",
  not_attending: "Not attending",
  undecided: "Undecided",
};

export const eventSettingsQuery = () =>
  queryOptions({
    queryKey: ["event-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return data as EventSettings;
    },
    staleTime: 60_000,
  });

export const TIMEZONE = "Africa/Johannesburg";

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-ZA", { timeZone: TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("en-ZA", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(d),
  };
}

/** Convert a UTC ISO string to a "YYYY-MM-DDTHH:mm" value in Johannesburg time (UTC+2, no DST). */
export function toJhbLocalInput(iso: string) {
  const d = new Date(new Date(iso).getTime() + 2 * 3600_000);
  return d.toISOString().slice(0, 16);
}
export function fromJhbLocalInput(v: string) {
  return new Date(`${v}:00+02:00`).toISOString();
}

export function applyTheme(s: Pick<EventSettings, "color_ivory" | "color_brown" | "color_gold" | "color_beige">) {
  if (typeof document === "undefined") return;
  const r = document.documentElement.style;
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (hex.test(s.color_ivory)) r.setProperty("--ivory", s.color_ivory);
  if (hex.test(s.color_brown)) r.setProperty("--brown", s.color_brown);
  if (hex.test(s.color_gold)) r.setProperty("--gold", s.color_gold);
  if (hex.test(s.color_beige)) r.setProperty("--beige", s.color_beige);
}

export function mapsUrl(venue: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
}

export const RSVP_ERRORS: Record<string, string> = {
  DUPLICATE_RSVP: "An RSVP with this phone number has already been received. Please contact us if you need to change it.",
  INVALID_NAME: "Please enter your full name.",
  INVALID_PHONE: "Please enter a valid phone number.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_GUEST_COUNT: "Please choose a valid number of guests.",
};

export function rsvpErrorMessage(msg: string | undefined) {
  if (!msg) return "Something went wrong. Please try again.";
  const key = Object.keys(RSVP_ERRORS).find((k) => msg.includes(k));
  return key ? RSVP_ERRORS[key] : "We couldn't save your RSVP. Please check your connection and try again.";
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function rsvpsToCsv(rows: Rsvp[]) {
  const headers = ["Full name", "Phone", "Email", "Attendance", "Guests", "Additional guests", "Dietary", "Accessibility", "Message", "Submitted", "Updated"];
  const lines = rows.map((r) =>
    [r.full_name, r.phone, r.email, ATTENDANCE_LABELS[r.attendance], r.guest_count, r.additional_guests, r.dietary, r.accessibility, r.message, r.created_at, r.updated_at]
      .map(csvCell)
      .join(","),
  );
  return [headers.map(csvCell).join(","), ...lines].join("\r\n");
}

export function computeStats(rows: Rsvp[]) {
  const attending = rows.filter((r) => r.attendance === "attending");
  return {
    responses: rows.length,
    attendingResponses: attending.length,
    expected: attending.reduce((n, r) => n + r.guest_count, 0),
    declines: rows.filter((r) => r.attendance === "not_attending").length,
    undecided: rows.filter((r) => r.attendance === "undecided").length,
  };
}
