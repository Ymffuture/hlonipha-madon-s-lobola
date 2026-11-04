import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TIMEZONE } from "@/lib/event";

/* ------------------------------------------------------------------ */
/* Live Johannesburg clock with an animated SVG face                   */
/* ------------------------------------------------------------------ */

const timeFmt = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateFmt = new Intl.DateTimeFormat("en-ZA", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Fixed UTC+2 (South Africa has no DST) — see TIMEZONE docs in lib/event. */
const TZ_OFFSET_MINUTES = 120;

type Angles = { hour: number; minute: number; second: number };

/** The classic "10:10" pose the hands start in, before sweeping round to the real time. */
const START_POSE: Angles = { hour: 305, minute: 60, second: 0 };

/** Angles (0–360) of each hand, plus the Johannesburg hour for the day/night icon. */
function handAngles(d: Date) {
  const local = new Date(d.getTime() + TZ_OFFSET_MINUTES * 60_000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const s = local.getUTCSeconds();
  return {
    hour: ((h % 12) + m / 60 + s / 3600) * 30,
    minute: (m + s / 60) * 6,
    second: s * 6,
    h,
  };
}

/**
 * Makes an angle keep growing (…354° → 360° → 366°…) instead of wrapping back to 0°.
 * Without this the hand would spin the long way round, backwards, every time it passes 12.
 */
function unwrap(prev: number, next: number) {
  let a = next + Math.floor(prev / 360) * 360;
  while (a < prev - 0.001) a += 360;
  return a;
}

/** One hand: a group rotated around the dial centre (22, 22) with a CSS transition. */
function Hand({ deg, transition, children }: { deg: number; transition: string; children: ReactNode }) {
  return (
    <g style={{ transformBox: "view-box", transformOrigin: "22px 22px", transform: `rotate(${deg}deg)`, transition }}>
      {children}
    </g>
  );
}

function AnimatedClock({ angles, hour24, settled, reduce }: { angles: Angles; hour24: number | null; settled: boolean; reduce: boolean }) {
  const uid = useId().replace(/:/g, "");
  const isDay = hour24 !== null && hour24 >= 6 && hour24 < 18;

  // First move: a slow, graceful sweep from 10:10 to the real time.
  // After that: crisp quartz "ticks" with a tiny overshoot, like a real second hand.
  const hourT = reduce ? "none" : settled ? "transform 1s linear" : "transform 1.4s cubic-bezier(.22,1,.36,1)";
  const minuteT = reduce ? "none" : settled ? "transform .5s cubic-bezier(.34,1.4,.64,1)" : "transform 1.4s cubic-bezier(.22,1,.36,1)";
  const secondT = reduce ? "none" : settled ? "transform .34s cubic-bezier(.34,1.7,.64,1)" : "transform 1.4s cubic-bezier(.22,1,.36,1)";

  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--beige)" }} />
          <stop offset=".45" style={{ stopColor: "var(--gold)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in oklab, var(--gold) 55%, black)" }} />
        </linearGradient>
        <radialGradient id={`${uid}-face`} cx=".38" cy=".3" r=".85">
          <stop offset="0" stopColor="rgb(255 255 255 / .22)" />
          <stop offset=".55" stopColor="rgb(0 0 0 / .28)" />
          <stop offset="1" stopColor="rgb(0 0 0 / .5)" />
        </radialGradient>
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy=".7" stdDeviation=".5" floodColor="#000" floodOpacity=".55" />
        </filter>
        <mask id={`${uid}-moon`}>
          <rect width="44" height="44" fill="white" />
          <circle cx="23.3" cy="29.9" r="2.1" fill="black" />
        </mask>
      </defs>

      {/* Bezel + glass face */}
      <circle cx="22" cy="22" r="20.6" fill={`url(#${uid}-bezel)`} />
      <circle cx="22" cy="22" r="19" fill={`url(#${uid}-face)`} />
      <circle cx="22" cy="22" r="19" fill="rgb(40 25 15 / .45)" />
      {/* Glass highlight */}
      <path d="M8.5 15.5A15 15 0 0 1 22 7" fill="none" stroke="rgb(255 255 255 / .35)" strokeWidth="1.1" strokeLinecap="round" />

      {/* Hour markers: long at 12/3/6/9, short for the rest */}
      {Array.from({ length: 12 }, (_, i) => {
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1="22"
            y1={major ? 4.8 : 5.4}
            x2="22"
            y2={major ? 8.4 : 7}
            stroke={major ? "var(--gold)" : "color-mix(in oklab, var(--ivory) 70%, transparent)"}
            strokeWidth={major ? 1.5 : 0.8}
            strokeLinecap="round"
            transform={`rotate(${i * 30} 22 22)`}
          />
        );
      })}

      {/* Little sun / moon: tells you at a glance if it is day or night in South Africa */}
      {hour24 !== null && (
        <motion.g
          key={isDay ? "day" : "night"}
          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 0.95, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          {isDay ? (
            <>
              <circle cx="22" cy="30.4" r="1.7" fill="var(--gold)" />
              {Array.from({ length: 8 }, (_, i) => (
                <line key={i} x1="22" y1="27.4" x2="22" y2="26.7" stroke="var(--gold)" strokeWidth=".6" strokeLinecap="round" transform={`rotate(${i * 45} 22 30.4)`} />
              ))}
            </>
          ) : (
            <circle cx="22" cy="30.4" r="2.4" fill="var(--ivory)" mask={`url(#${uid}-moon)`} />
          )}
        </motion.g>
      )}

      {/* Hands (hour, minute, second) with a soft shadow so they float above the face */}
      <g filter={`url(#${uid}-shadow)`}>
        <Hand deg={angles.hour} transition={hourT}>
          <path d="M22 24.2L20.6 22 22 13.2 23.4 22z" fill="var(--ivory)" />
        </Hand>
        <Hand deg={angles.minute} transition={minuteT}>
          <path d="M22 25L20.9 22 22 8.2 23.1 22z" fill="var(--ivory)" />
        </Hand>
        <Hand deg={angles.second} transition={secondT}>
          <line x1="22" y1="26.5" x2="22" y2="6.8" stroke="var(--gold)" strokeWidth=".7" strokeLinecap="round" />
          <circle cx="22" cy="26.4" r="1.1" fill="var(--gold)" />
        </Hand>
      </g>

      {/* Centre cap */}
      <circle cx="22" cy="22" r="1.9" fill={`url(#${uid}-bezel)`} />
      <circle cx="22" cy="22" r=".6" fill="rgb(0 0 0 / .6)" />
    </svg>
  );
}

function LiveDateTime({ reduce }: { reduce: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  const [angles, setAngles] = useState<Angles>(START_POSE);
  const [hour24, setHour24] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const a = handAngles(d);
      setNow(d);
      setHour24(a.h);
      // Functional update: always unwrap from the previous angles so the hands only ever move forward
      setAngles((prev) => ({
        hour: unwrap(prev.hour, a.hour),
        minute: unwrap(prev.minute, a.minute),
        second: unwrap(prev.second, a.second),
      }));
    };
    update();
    const settle = window.setTimeout(() => setSettled(true), 1500);
    const id = window.setInterval(update, 1000);
    // When the tab comes back from the background, jump to the right time immediately
    const onVisible = () => !document.hidden && update();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(settle);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const timeText = now ? timeFmt.format(now) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex items-center gap-3 rounded-full border border-gold/50 bg-brown/45 px-3 py-2 text-ivory shadow-[0_6px_24px_rgb(0_0_0/.35)] backdrop-blur-md sm:px-4"
      role="timer"
      aria-label={now ? `Current time in South Africa: ${timeFmt.format(now)}, ${dateFmt.format(now)}` : "Current time"}
    >
      <AnimatedClock angles={angles} hour24={hour24} settled={settled} reduce={reduce} />
      <div className="leading-tight">
        <p className="font-display text-base font-medium tracking-wide sm:text-lg">
          {timeText ? (
            <>
              {/* The time slides in gently each time the minute changes */}
              <motion.span
                key={timeText}
                initial={reduce ? false : { y: 7, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block tabular-nums"
              >
                {timeText}
              </motion.span>{" "}
              <span className="text-[0.6rem] uppercase tracking-[0.2em] text-beige">SAST</span>
            </>
          ) : (
            <span className="inline-block h-5 w-20 rounded bg-ivory/20" />
          )}
        </p>
        <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-beige/90 sm:text-xs">
          {now ? dateFmt.format(now) : <span className="inline-block h-3 w-28 rounded bg-ivory/15" />}
        </p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown menu — Report · Feedback · Create your invitation          */
/* ------------------------------------------------------------------ */

const MENU_ITEMS = [
  {
    label: "Report",
    description: "Something wrong on this page?",
    href: "mailto:futurekgomotso@gmail.com?subject=Invitation%20report&body=Please%20describe%20the%20issue:",
    icon: (
      <path d="M4 4h16v12H8l-4 4V4zm4 5h8M8 12h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    label: "Feedback",
    description: "Tell us how the invite feels",
    href: "mailto:futurekgomotso@gmail.com?subject=Invitation%20feedback",
    icon: (
      <path d="M4 20l3-3h11a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14zM9 9h6M9 12.5h4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    label: "Create your invitation",
    description: "Build one like this for your event",
    href: "https://swiftmeta.vercel.app",
    icon: (
      <path d="M12 3l2.2 5.3L19 10l-4.8 1.7L12 17l-2.2-5.3L5 10l4.8-1.7L12 3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    ),
    external: true,
  },
] as const;

function MenuDropdown({ reduce }: { reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel = reduce ? { duration: 0.01 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto relative"
    >
      <motion.button
        type="button"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 bg-brown/45 text-ivory shadow-[0_6px_24px_rgb(0_0_0/.35)] backdrop-blur-md transition-colors hover:bg-brown/70 sm:h-12 sm:w-12"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <motion.path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            animate={open ? { d: "M6 6l12 12M18 6L6 18", opacity: 1 } : { d: "M4 7h16M4 12h16M4 17h16", opacity: 1 }}
            transition={panel}
          />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Invitation menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={panel}
            className="absolute right-0 top-full mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-gold/40 bg-popover/95 text-popover-foreground shadow-[0_18px_50px_rgb(0_0_0/.45)] backdrop-blur-xl"
          >
            <ul>
              {MENU_ITEMS.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={reduce ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...panel, delay: reduce ? 0 : 0.05 * i }}
                >
                  <a
                    role="menuitem"
                    href={item.href}
                    {...("external" in item && item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gold/15"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/50 text-gold transition-transform duration-300 group-hover:rotate-12">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <p className="flex items-center justify-center gap-1.5 border-t border-gold/25 bg-brown/10 py-2.5 text-[0.65rem] text-muted-foreground">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gold" aria-hidden="true">
                <path d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5m-18 4l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Powered by <span className="font-semibold tracking-wide text-gold">SumStack</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Top corners — mounted inside <Hero>, above the curtain              */
/* ------------------------------------------------------------------ */

export function HeroTopBar() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5">
      <LiveDateTime reduce={!!reduce} />
      <MenuDropdown reduce={!!reduce} />
    </div>
  );
}
