import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, PencilLine } from "lucide-react";
import {
  lookupRsvpRpc,
  makeRsvpEditSchema,
  rsvpEditErrorMessage,
  updateRsvpSelfRpc,
  type RsvpLookup,
} from "@/lib/rsvp-edit";
import { ATTENDANCE_LABELS, formatEventDate, type Attendance, type EventSettings } from "@/lib/event";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MonogramLoader } from "./MonogramLoader";

type Step = "phone" | "loading" | "loaded" | "saved";

const initialEdit = {
  email: "",
  attendance: "attending" as Attendance,
  guest_count: 1,
  additional_guests: "",
  dietary: "",
  accessibility: "",
  message: "",
};

/**
 * "Check or edit your RSVP" — the guest types the phone number they registered
 * with, and a modal shows their reference code (e.g. HMTG-44863), their status
 * and an edit form. The database refuses edits once the event is within 7 days.
 */
export function RsvpEditModal({ settings }: { settings: EventSettings }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [rsvp, setRsvp] = useState<RsvpLookup | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialEdit);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState("");

  const reset = () => {
    setStep("phone");
    setPhone("");
    setPhoneError("");
    setRsvp(null);
    setSaving(false);
    setForm(initialEdit);
    setErrors({});
    setServerError("");
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 9) {
      setPhoneError("Please enter the phone number you registered with.");
      return;
    }
    setPhoneError("");
    setServerError("");
    setStep("loading");
    const { data, error } = await lookupRsvpRpc(phone);
    if (error || !data) {
      setServerError(rsvpEditErrorMessage(error?.message));
      setStep("phone");
      return;
    }
    const row = data;
    setRsvp(row);
    setForm({
      email: row.email ?? "",
      attendance: row.attendance,
      guest_count: row.guest_count < 1 ? 1 : row.guest_count,
      additional_guests: row.additional_guests ?? "",
      dietary: row.dietary ?? "",
      accessibility: row.accessibility ?? "",
      message: row.message ?? "",
    });
    setStep("loaded");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvp || saving) return;
    const parsed = makeRsvpEditSchema(settings.max_guests).safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<string, string>> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    const d = parsed.data;
    setSaving(true);
    setServerError("");
    const { data, error } = await updateRsvpSelfRpc({
      phone,
      attendance: d.attendance,
      guest_count: d.attendance === "not_attending" ? 0 : d.guest_count,
      additional_guests: d.additional_guests,
      dietary: d.dietary,
      accessibility: d.accessibility,
      message: d.message,
      email: d.email,
    });
    if (error || !data) {
      setServerError(rsvpEditErrorMessage(error?.message));
      setSaving(false);
      return;
    }
    setRsvp(data);
    setSaving(false);
    setStep("saved");
  }

  const closed = rsvp?.edit_closed ?? false;
  const attending = form.attendance !== "not_attending";
  const needsGuestNames = attending && form.guest_count > 1;
  const field = "mt-1.5 bg-background";
  const Err = ({ k }: { k: string }) =>
    errors[k] ? <p id={`edit-${k}-err`} className="mt-1 text-sm text-destructive">{errors[k]}</p> : null;

  const submitted = rsvp ? formatEventDate(rsvp.created_at) : null;
  const updated = rsvp ? formatEventDate(rsvp.updated_at) : null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-gold/50 bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:bg-gold/10"
      >
        <PencilLine className="h-4 w-4 text-gold" aria-hidden="true" />
        Check or edit your RSVP status
      </motion.button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-2xl border-border bg-card p-6 shadow-card sm:max-w-lg sm:p-8">
          {/* Reference code sits at the top of the modal, e.g. HMTG-44863 */}
          {rsvp && (
            <div className="mb-5 text-center">
              <DialogTitle className="sr-only">Your RSVP status</DialogTitle>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Your RSVP reference</p>
              <p className="font-display text-3xl tracking-[0.12em] text-gold">{rsvp.ref_code}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last 5 digits of your number · keep this reference
              </p>
            </div>
          )}

          {step === "loading" && (
            <div className="py-10">
              <MonogramLoader size="sm" label="Finding your RSVP…" />
            </div>
          )}

          {step === "phone" && (
            <form onSubmit={onLookup} className="space-y-4">
              <DialogTitle className="font-display text-2xl">Check or edit your RSVP</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Type the phone number you registered with to see your RSVP status and make changes.
              </p>
              <div>
                <Label htmlFor="edit-phone">Registered phone number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  autoComplete="tel"
                  className={field}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                  placeholder="e.g. 072 345 6789"
                  maxLength={20}
  
                  aria-invalid={!!phoneError}
                  aria-describedby="edit-phone-err"
                />
                {phoneError && <p id="edit-phone-err" className="mt-1 text-sm text-destructive">{phoneError}</p>}
              </div>
              {serverError && (
                <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>
              )}
              <button type="submit" className="flex w-full items-center justify-center rounded-full bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:brightness-110">
                Find my RSVP
              </button>
            </form>
          )}

          {step === "saved" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="py-8 text-center"
              role="status"
            >
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
              <h3 className="mt-4 text-2xl">Inkomu — your RSVP is updated!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Changes saved on {updated ? updated.date : ""}. Your reference is {rsvp?.ref_code}.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-6 rounded-full bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:brightness-110"
              >
                Done
              </button>
            </motion.div>
          )}

          {step === "loaded" && rsvp && (
            <div className="space-y-5">
              <div className="grid gap-2 rounded-xl border border-border bg-background p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                  <p className="font-medium">{rsvp.full_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="font-medium">{ATTENDANCE_LABELS[rsvp.attendance]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Guests</p>
                  <p className="font-medium">{rsvp.attendance === "not_attending" ? "—" : rsvp.guest_count}</p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                  <p className="font-medium">{submitted ? `${submitted.date} · ${submitted.time}` : ""}{updated && rsvp.updated_at !== rsvp.created_at ? ` (last changed ${updated.date})` : ""}</p>
                </div>
              </div>

              {closed ? (
                <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm leading-relaxed text-foreground" role="status">
                  Editing is closed — the celebration is less than 7 days away. Please contact the family on{" "}
                  <span className="font-medium">{settings.rsvp_contact}</span> if you need to change your RSVP.
                </div>
              ) : (
                <form onSubmit={onSave} noValidate className="space-y-5">
                  <p className="text-sm font-medium">Make your changes below:</p>

                  <fieldset>
                    <legend className="text-sm font-medium">Will you attend? *</legend>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["attending", "Attending"],
                          ["not_attending", "Not attending"],
                          ["undecided", "Undecided"],
                        ] as const
                      ).map(([v, l]) => (
                        <label key={v} className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm transition ${form.attendance === v ? "border-gold bg-gold text-accent-foreground" : "border-input bg-background hover:border-gold"}`}>
                          <input type="radio" name="edit-attendance" value={v} className="sr-only" checked={form.attendance === v} onChange={() => set("attendance", v)} />
                          {l}
                        </label>
                      ))}
                    </div>
                    <Err k="attendance" />
                  </fieldset>

                  {attending && (
                    <div>
                      <Label htmlFor="edit-guest_count">Number of guests (incl. you)</Label>
                      <select
                        id="edit-guest_count"
                        className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={form.guest_count}
                        onChange={(e) => set("guest_count", Number(e.target.value))}
                      >
                        {Array.from({ length: settings.max_guests }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <Err k="guest_count" />
                    </div>
                  )}

                  {attending && (
                    <div>
                      <Label htmlFor="edit-additional_guests">Additional guest names{needsGuestNames ? " *" : ""}</Label>
                      <Input
                        id="edit-additional_guests"
                        className={field}
                        value={form.additional_guests}
                        onChange={(e) => set("additional_guests", e.target.value)}
                        maxLength={1000}
                        placeholder="e.g. Tsakani, Rhulani"
                        aria-invalid={!!errors["additional_guests"]}
                        aria-describedby="edit-additional_guests-err"
                        required={needsGuestNames}
                      />
                      <Err k="additional_guests" />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="edit-dietary">Dietary requirements (optional)</Label>
                      <Textarea id="edit-dietary" className={field} rows={2} value={form.dietary} onChange={(e) => set("dietary", e.target.value)} maxLength={500} />
                    </div>
                    <div>
                      <Label htmlFor="edit-accessibility">Accessibility requirements (optional)</Label>
                      <Textarea id="edit-accessibility" className={field} rows={2} value={form.accessibility} onChange={(e) => set("accessibility", e.target.value)} maxLength={500} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-email">Email (optional)</Label>
                    <Input id="edit-email" type="email" autoComplete="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
                    <Err k="email" />
                  </div>

                  <div>
                    <Label htmlFor="edit-message">Message to the couple{needsGuestNames ? " *" : ""}</Label>
                    <Textarea
                      id="edit-message"
                      className={field}
                      rows={3}
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      maxLength={1000}
                      aria-invalid={!!errors["message"]}
                      aria-describedby="edit-message-err"
                      required={needsGuestNames}
                    />
                    <Err k="message" />
                  </div>

                  {serverError && (
                    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>
                  )}

                  <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
