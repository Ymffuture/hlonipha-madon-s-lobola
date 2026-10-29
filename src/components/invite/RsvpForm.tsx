import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, Info, Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { guestNamesStatus, makeRsvpSchema, maskPhone, rsvpErrorMessage, type Attendance } from "@/lib/event";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionTitle } from "./Ornament";

type Errors = Partial<Record<string, string>>;

export function RsvpForm({ maxGuests }: { maxGuests: number }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    attendance: "" as Attendance | "",
    guest_count: 1,
    additional_guests: "",
    dietary: "",
    accessibility: "",
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving" || status === "saved") return;
    const parsed = makeRsvpSchema(maxGuests).safeParse(form);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    const d = parsed.data;
    setStatus("saving");
    setServerError("");
    const { data, error } = await supabase.rpc("submit_rsvp", {
      _full_name: d.full_name,
      _phone: d.phone,
      _email: d.email,
      _attendance: d.attendance,
      _guest_count: d.attendance === "not_attending" ? 0 : d.guest_count,
      _additional_guests: d.additional_guests,
      _dietary: d.dietary,
      _accessibility: d.accessibility,
      _message: d.message,
    });
    if (error || !data) {
      setStatus("error");
      setServerError(rsvpErrorMessage(error?.message));
      return;
    }
    setStatus("saved");
  }

  if (status === "saved") {
    return (
      <section id="rsvp" className="scroll-mt-4 px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-10 text-center shadow-card"
          role="status"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <h2 className="mt-4 text-4xl">Inkomu — Thank you!</h2>
          <p className="mt-3 text-muted-foreground">
            Your RSVP has been saved. {form.attendance === "attending" ? "We can't wait to ululate with you!" : "Thank you for letting us know."}
          </p>
        </motion.div>
      </section>
    );
  }

  const attending = form.attendance !== "not_attending";
  const needsGuestNames = attending && form.guest_count > 1;
  const names = guestNamesStatus(form.guest_count, form.additional_guests);
  const SAMPLE_NAMES = ["Tsakani", "Rhulani", "Nkateko", "Hlulani", "Vutivi"];
  const namePlaceholder = names.expected > 0 ? `e.g. ${SAMPLE_NAMES.slice(0, names.expected).join(", ")}` : "";
  const nameHelp =
    names.expected === 1
      ? "Add 1 name (no comma needed)."
      : `Add ${names.expected} names separated by commas (${names.expected - 1} commas).`;
  const field = "mt-1.5 bg-background";
  const Err = ({ k }: { k: string }) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1 text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section id="rsvp" className="scroll-mt-4 bg-secondary px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <SectionTitle eyebrow="Kindly respond" title="RSVP" />
        <motion.form
          onSubmit={onSubmit}
          noValidate
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full name *</Label>
              <Input id="full_name" autoComplete="name" className={field} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} aria-invalid={!!errors["full_name"]} aria-describedby="full_name-err" maxLength={120} required />
              <Err k="full_name" />
            </div>
            <div>
              <Label htmlFor="phone">Phone number *</Label>
              <Input id="phone" type="tel" autoComplete="tel" className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors["phone"]} aria-describedby="phone-err" maxLength={20} required />
              <Err k="phone" />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" autoComplete="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors["email"]} aria-describedby="email-err" maxLength={255} />
            <Err k="email" />
          </div>

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
                <label key={v} className={`cursor-pointer rounded-lg border px-4 py-3 text-center text-sm transition ${form.attendance === v ? "border-gold bg-gold text-accent-foreground" : "border-input bg-background hover:border-gold"}`}>
                  <input type="radio" name="attendance" value={v} className="sr-only" checked={form.attendance === v} onChange={() => set("attendance", v)} />
                  {l}
                </label>
              ))}
            </div>
            <Err k="attendance" />
          </fieldset>

          {attending && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="guest_count">Number of guests (incl. you)</Label>
                <select id="guest_count" className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.guest_count} onChange={(e) => set("guest_count", Number(e.target.value))}>
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Err k="guest_count" />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="additional_guests">Additional guest names{needsGuestNames ? " *" : ""}</Label>
                  {needsGuestNames && (
                    <span
                      role="status"
                      aria-live="polite"
                      className={`flex items-center gap-1 text-xs font-medium ${names.state === "complete" ? "text-gold" : "text-destructive"}`}
                    >
                      {names.state === "complete" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                      {names.state === "complete" ? `Complete · ${names.got} of ${names.expected}` : names.state === "incomplete" ? `Incomplete · ${names.got} of ${names.expected}` : `Too many · ${names.got} of ${names.expected}`}
                    </span>
                  )}
                </div>
                <Input
                  id="additional_guests"
                  className={field}
                  value={form.additional_guests}
                  onChange={(e) => set("additional_guests", e.target.value)}
                  maxLength={1000}
                  placeholder={namePlaceholder}
                  aria-invalid={!!errors["additional_guests"] || (needsGuestNames && names.state !== "complete" && form.additional_guests.trim().length > 0)}
                  aria-describedby="additional_guests-help additional_guests-err"
                  required={needsGuestNames}
                />
                {needsGuestNames && (
                  <p id="additional_guests-help" className="mt-1 text-xs text-muted-foreground">
                    {nameHelp}
                  </p>
                )}
                <Err k="additional_guests" />
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="dietary">Dietary requirements (optional)</Label>
              <Textarea id="dietary" className={field} rows={2} value={form.dietary} onChange={(e) => set("dietary", e.target.value)} maxLength={500} />
            </div>
            <div>
              <Label htmlFor="accessibility">Accessibility requirements (optional)</Label>
              <Textarea id="accessibility" className={field} rows={2} value={form.accessibility} onChange={(e) => set("accessibility", e.target.value)} maxLength={500} />
            </div>
          </div>
          <div>
            <Label htmlFor="message">Message to the couple{needsGuestNames ? " *" : ""}</Label>
            <Textarea
              id="message"
              className={field}
              rows={3}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              maxLength={1000}
              aria-invalid={!!errors["message"]}
              aria-describedby="message-err"
              required={needsGuestNames}
            />
            <Err k="message" />
          </div>

          {status === "error" && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>
          )}

          <button type="submit" disabled={status === "saving"} className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm uppercase tracking-[0.25em] text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
            {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {status === "saving" ? "Saving…" : "Send RSVP"}
          </button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Privacy notice: your details are used only by the couple and their families to plan this celebration. They are stored securely, are never shown publicly or shared, and can be removed on request by contacting the RSVP number.
          </p>
        </motion.form>

        <AnimatePresence>
          {needsGuestNames && names.state === "incomplete" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-foreground"
              role="status"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
              <p>
                <span className="font-medium">{maskPhone(form.phone) || "e.g. 07*****82"}</span> — {names.got === 0 ? "additional guest names are required" : `guest names are incomplete (${names.got} of ${names.expected} added)`}. Please add them in the form above, or contact the family to have them added.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 rounded-xl border border-border bg-card p-5 text-xs leading-relaxed text-muted-foreground"
        >
          <p className="flex items-center gap-2 font-medium text-foreground">
            <ScrollText className="h-4 w-4 text-gold" aria-hidden="true" /> RSVP rules &amp; terms
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Please make sure your name, phone number and guest names are clear and correct.</li>
            <li>If your information is not clear for 15 days, your RSVP will be automatically unsaved (removed) from our system.</li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
