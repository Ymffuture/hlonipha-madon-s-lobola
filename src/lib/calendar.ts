import { TIMEZONE, toJhbLocalInput, type EventSettings } from "./event";

/**
 * Calendar invite helpers (RFC 5545 / iCalendar).
 *
 * Notes on time zone strategy:
 * - SAST (Africa/Johannesburg) is a fixed UTC+02:00 zone with no DST,
 *   so a single STANDARD component is a valid VTIMEZONE definition.
 * - Local times are emitted with a TZID reference so clients render the
 *   "SAST" label; clients convert automatically for their own zone.
 */

/** The luncheon is marked as a 4-hour event. */
const DURATION_HOURS = 4;
const DURATION_MS = DURATION_HOURS * 3_600_000;

/** RFC 5545 §3.1: lines SHOULD NOT exceed 75 octets (bytes), excluding CRLF. */
const MAX_LINE_OCTETS = 75;
const CRLF = "\r\n";

const encoder = new TextEncoder();

/** Shape produced by toJhbLocalInput(): "YYYY-MM-DDTHH:MM". */
const LOCAL_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function required(value: string | undefined | null, field: string): string {
  if (value == null || value.trim() === "") {
    throw new Error(`Calendar invite: missing required field "${field}".`);
  }
  return value.trim();
}

/** "YYYY-MM-DDTHH:MM" -> "YYYYMMDDTHHMMSS" (local, no seconds in input). */
function toIcsLocalDateTime(localInput: string, field: string): string {
  const m = LOCAL_INPUT_RE.exec(localInput);
  if (!m) {
    throw new Error(`Calendar invite: "${field}" is not a local datetime (got "${localInput}").`);
  }
  // Reject impossible dates like 2026-02-31 before emitting them.
  const [y, mo, d, h, mi] = [m[1], m[2], m[3], m[4], m[5]].map(Number);
  const probe = new Date(Date.UTC(2_000, mo - 1, d, h, mi));
  const valid =
    probe.getUTCMonth() === mo - 1 &&
    probe.getUTCDate() === d &&
    probe.getUTCHours() === h &&
    probe.getUTCMinutes() === mi;
  if (!valid) {
    throw new Error(`Calendar invite: "${field}" is not a real calendar datetime ("${localInput}").`);
  }
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00`;
}

/** Current UTC instant -> "YYYYMMDDTHHMMSSZ". */
function toIcsUtcStamp(ms: number = Date.now()): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** RFC 5545 §3.3.11 text escaping; strips non-printable control chars. */
function escapeIcsText(v: string): string {
  return v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Fold a content line at MAX_LINE_OCTETS, counting UTF-8 octets
 * (not JS characters) and never splitting a code point.
 * Continuation lines start with a single space, which costs 1 octet.
 */
function foldLine(line: string): string {
  if (encoder.encode(line).length <= MAX_LINE_OCTETS) return line;

const chunks: string[] = [];
  let start = 0;
  let budget = MAX_LINE_OCTETS;

for (let i = 0; i < line.length; ) {
    const cp = line.codePointAt(i)!;
    const units = cp > 0xffff ? 2 : 1;
    const octets = encoder.encode(String.fromCodePoint(cp)).length;

if (octets > budget) {
      chunks.push((start === 0 ? "" : " ") + line.slice(start, i));
      start = i;
      budget = MAX_LINE_OCTETS - 1; // reserve the leading space
    }
    budget -= octets;
    i += units;
  }
  chunks.push((start === 0 ? "" : " ") + line.slice(start));
  return chunks.join(CRLF);
}

/** Build a well-formed, fold-correct .ics body for the luncheon. */
export function buildInviteIcs(s: EventSettings): string {
  const coupleNames = required(s.couple_names, "couple_names");
  const eventName = required(s.event_name, "event_name");
  const venue = required(s.venue, "venue");
  const rsvpContact = required(s.rsvp_contact, "rsvp_contact");

const startLocal = toJhbLocalInput(s.event_datetime);
  const startIcs = toIcsLocalDateTime(startLocal, "event_datetime");

// Fixed +02:00 offset: derive the end wall-clock from the start instant.
  const startMs = Date.parse(`${startLocal}:00+02:00`);
  if (Number.isNaN(startMs)) {
    throw new Error(`Calendar invite: could not parse start "${startLocal}" as SAST.`);
  }
  const endLocal = toJhbLocalInput(new Date(startMs + DURATION_MS).toISOString());
  const endIcs = toIcsLocalDateTime(endLocal, "computed end");

// Unique but stable per-event UID (timestamp suffix avoids collisions
  // if the same event is regenerated).
  const uid = `lobola-luncheon-${startIcs}-${Date.now().toString(36)}@hm-invite`;

const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lobola Luncheon//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${TIMEZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0200",
    "TZNAME:SAST",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtcStamp()}`,
    `DTSTART;TZID=${TIMEZONE}:${startIcs}`,
    `DTEND;TZID=${TIMEZONE}:${endIcs}`,
    `SUMMARY:${escapeIcsText(`${coupleNames} — ${eventName}`)}`,
    `LOCATION:${escapeIcsText(venue)}`,
    `DESCRIPTION:${escapeIcsText(`It's time to ululate! RSVP enquiries: ${rsvpContact}`)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

return lines.map(foldLine).join(CRLF);
}

/** Trigger a browser download for an arbitrary blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  // Keep the object URL alive briefly so slower browsers (notably Safari)
  // can complete the download, then release it.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Convenience: build the invite and download it as "lobola-luncheon.ics". */
export function downloadCalendarInvite(s: EventSettings): void {
  const ics = buildInviteIcs(s);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  downloadBlob(blob, "lobola-luncheon.ics");
}
