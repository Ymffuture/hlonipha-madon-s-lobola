import { describe, expect, it } from "vitest";
import { editDaysLeft, editWindowClosed, makeRsvpEditSchema, rsvpEditErrorMessage } from "@/lib/rsvp-edit";

const NOW = new Date("2026-10-29T08:00:00Z");
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

describe("7-day edit window rule", () => {
  it("allows editing when more than 7 days are left", () => {
    expect(editWindowClosed(daysFromNow(8), NOW)).toBe(false);
    expect(editWindowClosed(daysFromNow(30), NOW)).toBe(false);
  });

  it("blocks editing when 7 days or fewer are left", () => {
    expect(editWindowClosed(daysFromNow(7), NOW)).toBe(true);
    expect(editWindowClosed(daysFromNow(3), NOW)).toBe(true);
    expect(editWindowClosed(daysFromNow(0), NOW)).toBe(true);
    expect(editWindowClosed(daysFromNow(-1), NOW)).toBe(true);
  });

  it("counts the days still open for editing", () => {
    expect(editDaysLeft(daysFromNow(30), NOW)).toBe(23);
    expect(editDaysLeft(daysFromNow(8), NOW)).toBe(1);
    expect(editDaysLeft(daysFromNow(3), NOW)).toBe(0);
  });
});

describe("edit form rules", () => {
  const schema = makeRsvpEditSchema(5);

  it("requires guest names when bringing more than 1 guest", () => {
    const parsed = schema.safeParse({
      email: "", attendance: "attending", guest_count: 3,
      additional_guests: "  ", dietary: "", accessibility: "", message: "Congratulations!",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path[0]).toBe("additional_guests");
  });

  it("requires a message to the couple when bringing more than 1 guest", () => {
    const parsed = schema.safeParse({
      email: "", attendance: "attending", guest_count: 2,
      additional_guests: "Tsakani", dietary: "", accessibility: "", message: " ",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0].path[0]).toBe("message");
  });

  it("accepts a single attending guest with no names or message", () => {
    const parsed = schema.safeParse({
      email: "", attendance: "attending", guest_count: 1,
      additional_guests: "", dietary: "", accessibility: "", message: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects more guests than allowed", () => {
    const parsed = schema.safeParse({
      email: "", attendance: "attending", guest_count: 6,
      additional_guests: "a, b", dietary: "", accessibility: "", message: "hi",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows a decline with zero guests", () => {
    const parsed = schema.safeParse({
      email: "", attendance: "not_attending", guest_count: 0,
      additional_guests: "", dietary: "", accessibility: "", message: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("friendly error messages", () => {
  it("maps the closed-window error", () => {
    expect(rsvpEditErrorMessage("EDIT_WINDOW_CLOSED")).toContain("less than 7 days");
  });

  it("maps the not-found error", () => {
    expect(rsvpEditErrorMessage("NOT_FOUND")).toContain("couldn't find an RSVP");
  });

  it("falls back to a generic message", () => {
    expect(rsvpEditErrorMessage(undefined)).toContain("Something went wrong");
  });
});
