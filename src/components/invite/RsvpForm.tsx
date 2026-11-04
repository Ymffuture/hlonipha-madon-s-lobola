import { useState, type ComponentProps } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, CheckCircle2, Clock, Info, Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ARRIVAL_OPTIONS, formatEventDate, guestNamesStatus, makeRsvpSchema, maskPhone, rsvpErrorMessage, type Arrival, type Attendance, type EventSettings } from "@/lib/event";
import { RsvpEditModal } from "./RsvpEditModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionTitle } from "./Ornament";

type Errors = Partial<Record<string, string>>;

type FloatingInputProps = ComponentProps<typeof Input> & { label: string };
function FloatingInput({ label, className = "", ...props }: FloatingInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        placeholder=" "
        className={`peer h-12 rounded-xl border-border/70 bg-background/65 px-4 pt-3 pb-1 text-[15px] shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.035),0_1px_2px_hsl(var(--foreground)/0.025)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent hover:border-gold/50 focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/20 [&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_hsl(var(--background))_inset] ${className}`}
      />
      <Label
        htmlFor={props.id}
        className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:scale-100 peer-focus:top-0 peer-focus:text-xs peer-focus:scale-100 peer-focus:text-gold"
      >
        {label}
      </Label>
    </div>
  );
}

type FloatingTextareaProps = ComponentProps<typeof Textarea> & { label: string };
function FloatingTextarea({ label, className = "", ...props }: FloatingTextareaProps) {
  return (
    <div className="relative">
      <Textarea
        {...props}
        placeholder=" "
        className={`peer min-h-[88px] rounded-xl border-border/70 bg-background/65 px-4 pt-5 pb-3 text-[15px] shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.035),0_1px_2px_hsl(var(--foreground)/0.025)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent hover:border-gold/50 focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/20 [&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_hsl(var(--background))_inset] ${className}`}
      />
      <Label
        htmlFor={props.id}
        className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:text-xs peer-focus:text-gold"
      >
        {label}
      </Label>
    </div>
  );
}


const ARRIVAL_TEXT: Record<Arrival, { title: string; hint: (start: string | null) => string }> = {
  early: { title: "Earlier", hint: (t) => (t ? `Before ${t}` : "Before the start time") },
  on_time: { title: "On time", hint: (t) => (t ? `Around ${t}` : "Around the start time") },
  late: { title: "A bit late", hint: () => "Up to 1 hour after the start" },
};

export function RsvpForm({ settings }: { settings: EventSettings }) {
  const maxGuests = settings.max_guests;
  const reduce = useReducedMotion();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    attendance: "" as Attendance | "",
    guest_count: 1,
    additional_guests: "",
    arrival_time: "" as Arrival | "",
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
    const coming = d.attendance !== "not_attending";
    const arrival = coming ? d.arrival_time : "";
    setStatus("saving");
    setServerError("");
    const args = {
      _full_name: d.full_name,
      _phone: d.phone,
      _email: d.email,
      _attendance: d.attendance,
      _guest_count: coming ? d.guest_count : 0,
      // The names field is closed for a single guest, so never send stale names from an earlier choice
      _additional_guests: coming && d.guest_count > 1 ? d.additional_guests : "",
      _dietary: d.dietary,
      _accessibility: d.accessibility,
      _message: d.message,
    };
    let { data, error } = await supabase.rpc("submit_rsvp", arrival ? { ...args, _arrival_time: arrival } : args);
    // Safety net: if the website is updated before sql/rsvp-arrival.sql has been run, the database does not
    // know the arrival field yet. Save the RSVP without it instead of failing.
    if (error && arrival && (error.code === "PGRST202" || /schema cache/i.test(error.message))) {
      console.warn("[rsvp] arrival_time is not in the database yet, saving without it. Run sql/rsvp-arrival.sql.");
      ({ data, error } = await supabase.rpc("submit_rsvp", args));
    }
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
  const startTime = settings.event_datetime ? formatEventDate(settings.event_datetime).time : null;

  const Err = ({ k }: { k: string }) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1 text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <section id="rsvp" className="scroll-mt-4 bg-transparent px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <SectionTitle eyebrow="Kindly respond" title="RSVP" />
        <motion.form
          onSubmit={onSubmit}
          noValidate
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6 rounded-[1.75rem] border border-border/50 bg-card/55 p-5 shadow-[0_18px_60px_-35px_hsl(var(--foreground)/0.22)] backdrop-blur-xl sm:p-9"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FloatingInput id="full_name" label="Full name *" autoComplete="name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} aria-invalid={!!errors["full_name"]} aria-describedby="full_name-err" maxLength={120} required />
              <Err k="full_name" />
            </div>
            <div>
              <FloatingInput id="phone" label="Phone number *" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors["phone"]} aria-describedby="phone-err" maxLength={20} required />
              <Err k="phone" />
            </div>
          </div>
          <div>
            <FloatingInput id="email" label="Email *" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors["email"]} aria-describedby="email-err" maxLength={255} required />
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
            <div className="space-y-5">
              <div className="sm:max-w-xs">
                <Label htmlFor="guest_count">Number of guests (incl. you)</Label>
                <select id="guest_count" className="mt-1.5 h-12 w-full rounded-xl border border-border/70 bg-background/65 px-4 text-sm shadow-sm transition hover:border-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/20" value={form.guest_count} onChange={(e) => set("guest_count", Number(e.target.value))}>
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <Err k="guest_count" />
                {!needsGuestNames && maxGuests > 1 && (
                  <p className="mt-1 text-xs text-muted-foreground">Bringing others? Choose 2 or more and a field for their names will open.</p>
                )}
              </div>

              {/* Closed for 1 guest, slides open for 2 or more */}
              <AnimatePresence initial={false}>
                {needsGuestNames && (
                  <motion.div
                    key="guest-names"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduce ? 0.01 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="-mx-1 overflow-hidden px-1 pb-1"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="additional_guests">Additional guest names *</Label>
                      <span
                        role="status"
                        aria-live="polite"
                        className={`flex items-center gap-1 text-xs font-medium ${names.state === "complete" ? "text-gold" : "text-destructive"}`}
                      >
                        {names.state === "complete" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                        {names.state === "complete" ? `Complete · ${names.got} of ${names.expected}` : names.state === "incomplete" ? `Incomplete · ${names.got} of ${names.expected}` : `Too many · ${names.got} of ${names.expected}`}
                      </span>
                    </div>
                    <FloatingInput
                      id="additional_guests"
                      label="Additional guest names *"
                      value={form.additional_guests}
                      onChange={(e) => set("additional_guests", e.target.value)}
                      maxLength={1000}
                      aria-invalid={!!errors["additional_guests"] || (names.state !== "complete" && form.additional_guests.trim().length > 0)}
                      aria-describedby="additional_guests-help additional_guests-err"
                      required
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Example: {namePlaceholder}</p>
                    <p id="additional_guests-help" className="mt-1 text-xs text-muted-foreground">
                      {nameHelp}
                    </p>
                    <Err k="additional_guests" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {attending && (
            <fieldset>
              <legend className="flex items-center gap-1.5 text-sm font-medium">
                <Clock className="h-4 w-4 text-gold" aria-hidden="true" />
                When will you arrive?{form.attendance === "attending" ? " *" : ""}
              </legend>
              {startTime && <p className="mt-1 text-xs text-muted-foreground">The celebration starts at {startTime}. Knowing when to expect you helps us plan seating and food.</p>}
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ARRIVAL_OPTIONS.map((v) => (
                  <label key={v} className={`cursor-pointer rounded-lg border px-4 py-3 text-center text-sm transition ${form.arrival_time === v ? "border-gold bg-gold text-accent-foreground" : "border-input bg-background hover:border-gold"}`}>
                    <input type="radio" name="arrival_time" value={v} className="sr-only" checked={form.arrival_time === v} onChange={() => set("arrival_time", v)} />
                    <span className="block font-medium">{ARRIVAL_TEXT[v].title}</span>
                    <span className="block text-xs opacity-80">{ARRIVAL_TEXT[v].hint(startTime)}</span>
                  </label>
                ))}
              </div>
              <Err k="arrival_time" />
            </fieldset>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FloatingTextarea id="dietary" label="Dietary requirements (optional)" rows={2} value={form.dietary} onChange={(e) => set("dietary", e.target.value)} maxLength={500} />
            </div>
            <div>
              <FloatingTextarea id="accessibility" label="Accessibility requirements (optional)" rows={2} value={form.accessibility} onChange={(e) => set("accessibility", e.target.value)} maxLength={500} />
            </div>
          </div>
          <div>
            <FloatingTextarea
              id="message"
              label="Message to the couple *"
              rows={3}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              maxLength={1000}
              aria-invalid={!!errors["message"]}
              aria-describedby="message-err"
              required
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

        <RsvpEditModal settings={settings} />
      </div>
    </section>
  );
}
