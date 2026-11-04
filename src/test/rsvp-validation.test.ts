import { describe, expect, it } from "vitest";
import { buildInviteIcs } from "@/lib/calendar";
import {
  guestNamesStatus,
  makeRsvpSchema,
  maskPhone,
  type Attendance,
  type EventSettings,
} from "@/lib/event";

const base = {
  full_name: "Anna Shilenge",
  phone: "0723456789",
  email: "anna@example.com",
  attendance: "attending" as Attendance,
  guest_count: 2,
  additional_guests: "",
  dietary: "",
  accessibility: "",
  message: "",
  arrival_time: "on_time",
};

function failingPaths(data: typeof base, max = 5) {
  const r = makeRsvpSchema(max).safeParse(data);
  if (r.success) return [] as string[];
  return r.error.issues.map((i) => String(i.path[0]));
}

describe("RSVP validation rules", () => {
  it("requires additional guest names when guest count is greater than 1", () => {
    expect(failingPaths(base)).toContain("additional_guests");
  });

  it("always requires a message to the couple", () => {
    expect(failingPaths(base)).toContain("message");
    expect(failingPaths({ ...base, guest_count: 1 })).toContain("message");
    expect(failingPaths({ ...base, attendance: "not_attending", guest_count: 1 })).toContain("message");
  });

  it("requires an email address, and it must be valid", () => {
    expect(failingPaths({ ...base, guest_count: 1, message: "Hi", email: "" })).toContain("email");
    expect(failingPaths({ ...base, guest_count: 1, message: "Hi", email: "not-an-email" })).toContain("email");
    expect(failingPaths({ ...base, guest_count: 1, message: "Hi" })).toEqual([]);
  });

  it("requires an arrival time only when attending, and only the 3 known choices", () => {
    const ok = { ...base, guest_count: 1, message: "Hi" };
    expect(failingPaths({ ...ok, arrival_time: "" })).toContain("arrival_time");
    expect(failingPaths({ ...ok, arrival_time: "early" })).toEqual([]);
    expect(failingPaths({ ...ok, arrival_time: "late" })).toEqual([]);
    expect(failingPaths({ ...ok, arrival_time: "midnight" })).toContain("arrival_time");
    expect(failingPaths({ ...ok, attendance: "undecided", arrival_time: "" })).not.toContain("arrival_time");
    expect(failingPaths({ ...ok, attendance: "not_attending", arrival_time: "" })).not.toContain("arrival_time");
  });

  it("accepts an RSVP for more than one guest when names and message are provided", () => {
    const r = makeRsvpSchema(5).safeParse({
      ...base,
      guest_count: 3,
      additional_guests: "Tsakani, Rhulani",
      message: "Congratulations!",
    });
    expect(r.success).toBe(true);
  });

  it("guest count includes you: 3 guests need 2 other names (1 comma between them)", () => {
    expect(guestNamesStatus(3, "Tsakani, Rhulani")).toEqual({
      expected: 2,
      got: 2,
      state: "complete",
    });
    expect(guestNamesStatus(2, "Tsakani")).toEqual({ expected: 1, got: 1, state: "complete" });
  });

  it("flags too few names as incomplete, with a count in the message", () => {
    expect(guestNamesStatus(4, "Tsakani, Rhulani").state).toBe("incomplete");
    const r = makeRsvpSchema(5).safeParse({
      ...base,
      guest_count: 4,
      additional_guests: "Tsakani, Rhulani",
      message: "Hi",
    });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues.find((i) => i.path[0] === "additional_guests")?.message).toMatch(
        /Incomplete: 2 of 3/,
      );
  });

  it("flags more names than guests, and ignores stray commas and spaces", () => {
    expect(guestNamesStatus(2, "Tsakani, Rhulani").state).toBe("too_many");
    expect(guestNamesStatus(3, " Tsakani ,, Rhulani, ")).toEqual({
      expected: 2,
      got: 2,
      state: "complete",
    });
    expect(
      failingPaths({ ...base, guest_count: 2, additional_guests: "A One, B Two", message: "Hi" }),
    ).toContain("additional_guests");
  });

  it("does not require guest names for a single guest", () => {
    expect(failingPaths({ ...base, guest_count: 1 })).not.toContain("additional_guests");
  });

  it("does not require guest names when not attending", () => {
    expect(failingPaths({ ...base, attendance: "not_attending", guest_count: 1 })).not.toContain("additional_guests");
  });

  it("masks phone numbers for the smart info hint", () => {
    expect(maskPhone("0723456789")).toBe("07******89");
    expect(maskPhone("123")).toBe("");
  });
});

const settings = {
  event_datetime: "2026-12-22T10:00:00Z",
  venue: "Xihoko Village, Tzaneen",
  couple_names: "Hlonipha & Mcdon",
  event_name: "Lobola Luncheon",
  rsvp_contact: "072 345 6789",
} as unknown as EventSettings;

describe("Calendar invitation download", () => {
  it("includes the event start in Johannesburg time and the venue", () => {
    const ics = buildInviteIcs(settings);
    expect(ics).toContain("DTSTART;TZID=Africa/Johannesburg:20261222T120000");
    expect(ics).toContain("DTEND;TZID=Africa/Johannesburg:20261222T160000");
    expect(ics).toContain("LOCATION:Xihoko Village\\, Tzaneen");
    expect(ics).toContain("SUMMARY:Hlonipha & Mcdon — Lobola Luncheon");
  });
});
