import { z } from "zod";
import type { Attendance } from "./event";

export const EDIT_WINDOW_DAYS = 7;

/** True once the celebration is within 7 days (or has passed) — editing is then closed. */
export function editWindowClosed(eventIso: string, now: Date = new Date()) {
  return new Date(eventIso).getTime() - now.getTime() <= EDIT_WINDOW_DAYS * 86_400_000;
}

/** Whole days left before the 7-day edit window closes (never below 0). */
export function editDaysLeft(eventIso: string, now: Date = new Date()) {
  return Math.max(0, Math.ceil((new Date(eventIso).getTime() - EDIT_WINDOW_DAYS * 86_400_000 - now.getTime()) / 86_400_000));
}

/** Row shape returned by the lookup_rsvp / update_rsvp_self database functions. */
export type RsvpLookup = {
  ref_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  attendance: Attendance;
  guest_count: number;
  additional_guests: string | null;
  dietary: string | null;
  accessibility: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
  edit_closed: boolean;
};

export const RSVP_EDIT_ERRORS: Record<string, string> = {
  NOT_FOUND: "We couldn't find an RSVP with that phone number. Please check the number, or RSVP for the first time in the form above.",
  INVALID_PHONE: "Please enter a valid phone number.",
  INVALID_EMAIL: "Please enter a valid email address.",
  INVALID_GUEST_COUNT: "Please choose a valid number of guests.",
  GUEST_NAMES_REQUIRED: "Additional guest names are required when bringing more than 1 guest.",
  MESSAGE_REQUIRED: "Please write a short message to the couple.",
  EDIT_WINDOW_CLOSED: "Editing is closed — the celebration is less than 7 days away. Please contact the family to make changes.",
};

export function rsvpEditErrorMessage(msg: string | undefined) {
  if (!msg) return "Something went wrong. Please try again.";
  const key = Object.keys(RSVP_EDIT_ERRORS).find((k) => msg.includes(k));
  return key ? (RSVP_EDIT_ERRORS[key] ?? "") : "We couldn't save your changes. Please check your connection and try again.";
}

/** Validation for the edit form (name and phone stay fixed, so they aren't editable). */
export const makeRsvpEditSchema = (max: number) =>
  z
    .object({
      email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email").max(255)]),
      attendance: z.enum(["attending", "not_attending", "undecided"], { message: "Please choose your attendance" }),
      guest_count: z.number().int(),
      additional_guests: z.string().max(1000),
      dietary: z.string().max(500),
      accessibility: z.string().max(500),
      message: z.string().max(1000),
    })
    .refine((d) => d.attendance === "not_attending" || (d.guest_count >= 1 && d.guest_count <= max), {
      path: ["guest_count"],
      message: `Choose between 1 and ${max} guests`,
    })
    .refine(
      (d) => d.attendance === "not_attending" || d.guest_count <= 1 || d.additional_guests.trim().length >= 2,
      { path: ["additional_guests"], message: "Additional guest names are required when bringing more than 1 guest" },
    )
    .refine(
      (d) => d.attendance === "not_attending" || d.guest_count <= 1 || d.message.trim().length >= 2,
      { path: ["message"], message: "Please write a short message to the couple" },
    );
