import { TIMEZONE, toJhbLocalInput, type EventSettings } from "./event";

/** Calendar block length: the luncheon is marked as a 4-hour event. */
const DURATION_HOURS = 4;

function icsLocal(v: string) {
  return `${v.replace(/[-:]/g, "")}00`;
}

function escapeIcsText(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function foldLine(line: string) {
  if (line.length <= 74) return line;
  const chunks: string[] = [line.slice(0, 74)];
  let rest = line.slice(74);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  return chunks.join("\r\n");
}

export function buildInviteIcs(s: EventSettings) {
  const startLocal = toJhbLocalInput(s.event_datetime);
  const startMs = new Date(`${startLocal}:00+02:00`).getTime();
  const endLocal = toJhbLocalInput(new Date(startMs + DURATION_HOURS * 3_600_000).toISOString());
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lobola Luncheon//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${TIMEZONE}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T020000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0200",
    "TZNAME:SAST",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:lobola-luncheon-${startLocal.replace(/[-T:]/g, "")}@hm-invite`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${TIMEZONE}:${icsLocal(startLocal)}`,
    `DTEND;TZID=${TIMEZONE}:${icsLocal(endLocal)}`,
    `SUMMARY:${escapeIcsText(`${s.couple_names} — ${s.event_name}`)}`,
    `LOCATION:${escapeIcsText(s.venue)}`,
    `DESCRIPTION:${escapeIcsText(`It's time to ululate! RSVP enquiries: ${s.rsvp_contact}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadCalendarInvite(s: EventSettings) {
  const blob = new Blob([buildInviteIcs(s)], { type: "text/calendar;charset=utf-8" });
  downloadBlob(blob, "lobola-luncheon.ics");
}
