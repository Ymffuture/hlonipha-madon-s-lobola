import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PartyPopper, Sparkles } from "lucide-react";
import { TIMEZONE } from "@/lib/event";

/**
 * before : more than one calendar day to go
 * today  : it is the event day (Africa/Johannesburg) but the event hasn't started yet
 * live   : the event has started, and it is still the event day
 * after  : the event day is over
 */
type Phase = "before" | "today" | "live" | "after";

const PHASES: Phase[] = ["before", "today", "live", "after"];

/** "2026-12-22" for a given instant, in the event's time zone (so "today" means today in Tzaneen, not in the visitor's zone). */
const dayKey = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);

function snapshot(target: number, forced: Phase | null) {
  const now = Date.now();
  const ms = Math.max(0, target - now);
  const sameDay = dayKey(now) === dayKey(target);
  const natural: Phase = ms > 0 ? (sameDay ? "today" : "before") : sameDay ? "live" : "after";
  return {
    phase: forced ?? natural,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

// Fixed values (no Math.random) so the markup is predictable.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 5) % 100,
  delay: (i % 7) * 0.45,
  dur: 3.4 + (i % 5) * 0.55,
  size: 6 + (i % 3) * 3,
  spin: (i % 2 ? 1 : -1) * (200 + i * 25),
  tone: ["bg-gold", "bg-ivory", "bg-beige", "bg-primary"][i % 4],
}));

function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-10 bottom-0 overflow-hidden"
    >
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className={`absolute top-0 block rounded-[2px] ${c.tone}`}
          style={{ left: `${c.x}%`, width: c.size, height: c.size * 1.6 }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 320, rotate: c.spin, opacity: [0, 1, 1, 0] }}
          transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function TodayBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 14 }}
      className="mb-6 text-center"
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-gold bg-black/40 px-5 py-2 text-xs uppercase tracking-[0.35em] text-gold backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
        Today is the day
      </span>
      <p className="mt-4 flex items-center justify-center gap-2 font-display text-3xl italic text-gold-gradient sm:text-4xl">
        <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
        Namuntlha! Ku tsakile!
        <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
      </p>
    </motion.div>
  );
}

/** Counts down to an absolute instant (stored with the Africa/Johannesburg offset). */
export function Countdown({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const reduce = useReducedMotion();
  const [t, setT] = useState<ReturnType<typeof snapshot> | null>(null);

  useEffect(() => {
    // Preview helper: open the site with ?countdown=today (or live / after / before)
    // to see each state before the real date. Safe to delete these 3 lines later.
    const q = new URLSearchParams(window.location.search).get("countdown");
    const forced = PHASES.includes(q as Phase) ? (q as Phase) : null;

    setT(snapshot(target, forced));
    const id = setInterval(() => setT(snapshot(target, forced)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t?.phase === "live") {
    return (
      <div className="relative py-10 text-center">
        {!reduce && <Confetti />}
        <PartyPopper className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
        <p className="mt-3 font-display text-3xl italic text-gold sm:text-4xl">
          The celebration has begun — Ku tsakile!
        </p>
      </div>
    );
  }

  if (t?.phase === "after") {
    return (
      <p className="text-center font-display text-3xl italic text-gold">
        Thank you for celebrating with us — Inkomu!
      </p>
    );
  }

  const isToday = t?.phase === "today";
  const units = [
    ["Days", t?.days],
    ["Hours", t?.hours],
    ["Minutes", t?.minutes],
    ["Seconds", t?.seconds],
  ] as const;

  return (
    <div className="relative">
      {isToday && !reduce && <Confetti />}
      {isToday && <TodayBadge />}
      <div className="relative grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
        {units.map(([label, v], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-lg border bg-black/30 px-2 py-4 text-center text-ivory shadow-card backdrop-blur-md ${
              isToday
                ? "border-gold shadow-[0_0_28px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                : "border-ivory/30"
            }`}
          >
            <div className="font-display text-3xl tabular-nums text-ivory sm:text-5xl">
              {v == null ? (
                "–"
              ) : (
                <motion.span
                  key={v}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="inline-block"
                >
                  {String(v).padStart(2, "0")}
                </motion.span>
              )}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-beige sm:text-xs">
              {label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
