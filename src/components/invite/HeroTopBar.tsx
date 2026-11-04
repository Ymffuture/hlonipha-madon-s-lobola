import { useEffect, useRef, useState } from "react";
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

/** Hour/minute/second hands as degrees on a 0–360 dial. */
function handAngles(d: Date, tzOffsetMinutes: number) {
  const local = new Date(d.getTime() + tzOffsetMinutes * 60_000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const s = local.getUTCSeconds();
  return {
    hour: ((h % 12) + m / 60) * 30,
    minute: (m + s / 60) * 6,
    second: s * 6,
    raw: { h, m, s },
  };
}

/** Fixed UTC+2 (South Africa has no DST) — see TIMEZONE docs in lib/event. */
const TZ_OFFSET_MINUTES = 120;

function AnimatedClock({ now, reduce }: { now: Date | null; reduce: boolean }) {
  const { hour, minute, second } = handAngles(now ?? new Date(), TZ_OFFSET_MINUTES);
  const tick = { duration: 0.35, ease: [0.34, 1.3, 0.64, 1] as const };
  const t = reduce ? { duration: 0.01 } : tick;

  return (
    <svg viewBox="0 0 44 44" className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" aria-hidden="true">
      {/* Face: soft glass ring over the video */}
      <circle cx="22" cy="22" r="20" fill="rgb(0 0 0 / .35)" stroke="var(--gold)" strokeWidth="1.4" />
      <circle cx="22" cy="22" r="16.5" fill="none" stroke="color-mix(in oklab, var(--ivory) 35%, transparent)" strokeWidth="0.6" />
      {/* Hour markers */}
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="22" y1="8.5" x2="22" y2="11"
          stroke="var(--gold)" strokeWidth="1.4"
          transform={`rotate(${deg} 22 22)`}
        />
      ))}
      {/* Hands — rotate live from the Johannesburg clock */}
      <motion.line
        x1="22" y1="22" x2="22" y2="13.5" stroke="var(--ivory)" strokeWidth="1.8" strokeLinecap="round"
        style={{ transformBox: "fill-box", transformOrigin: "bottom center" }}
        animate={{ rotate: hour }} transition={t}
      />
      <motion.line
        x1="22" y1="22" x2="22" y2="9.5" stroke="var(--ivory)" strokeWidth="1.2" strokeLinecap="round"
        style={{ transformBox: "fill-box", transformOrigin: "bottom center" }}
        animate={{ rotate: minute }} transition={t}
      />
      <motion.line
        x1="22" y1="24" x2="22" y2="8" stroke="var(--gold)" strokeWidth="0.8" strokeLinecap="round"
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        animate={{ rotate: second }} transition={t}
      />
      <circle cx="22" cy="22" r="1.6" fill="var(--gold)" />
    </svg>
  );
}

function LiveDateTime({ reduce }: { reduce: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-auto flex items-center gap-3 rounded-full border border-gold/50 bg-brown/45 px-3 py-2 text-ivory shadow-[0_6px_24px_rgb(0_0_0/.35)] backdrop-blur-md sm:px-4"
      role="timer"
      aria-label={now ? `Current time in South Africa: ${timeFmt.format(now)}, ${dateFmt.format(now)}` : "Current time"}
    >
      <AnimatedClock now={now} reduce={reduce} />
      <div className="leading-tight">
        <p className="font-display text-base font-medium tracking-wide sm:text-lg">
          {now ? (
            <>
              {timeFmt.format(now)} <span className="text-[0.6rem] uppercase tracking-[0.2em] text-beige">SAST</span>
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
    href: "https://sumstacks.vercel.app",
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
