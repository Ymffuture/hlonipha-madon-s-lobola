import { useEffect, useState } from "react";
import type { EventSettings } from "@/lib/event";
import { motion, useReducedMotion, type MotionStyle } from "framer-motion";
import { Typewriter } from "./Motion";
import { Flourish } from "./Ornament";
import { VideoBackground } from "./VideoBackground";

/** How long the closed curtain is shown before it opens by itself (ms). */
const AUTO_OPEN_DELAY = 1800;
/** Slow start, fast middle, soft landing: feels like a heavy fabric. */
const CURTAIN_EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Velvet look built from the site's own palette (--brown / --gold):
 * vertical folds (repeating gradient) + top/bottom shading.
 * Because the panels are scaled on X when opening, the folds
 * compress together and look like fabric gathering up.
 */
const velvet: MotionStyle = {
  backgroundImage: `
    linear-gradient(180deg, rgb(0 0 0 / .55) 0%, transparent 22%, transparent 78%, rgb(0 0 0 / .6) 100%),
    repeating-linear-gradient(
      90deg,
      color-mix(in oklab, var(--brown) 65%, black) 0px,
      var(--brown) 26px,
      color-mix(in oklab, var(--brown) 72%, var(--gold)) 46px,
      var(--brown) 66px,
      color-mix(in oklab, var(--brown) 65%, black) 92px
    )`,
};

type CurtainProps = {
  open: boolean;
  monogram: string;
  onOpen: () => void;
  onDone: () => void;
};

function Curtain({ open, monogram, onOpen, onDone }: CurtainProps) {
  const panelTransition = {
    scaleX: { duration: 1.9, ease: CURTAIN_EASE },
    // After the drapes have gathered, fade the leftovers so nothing "pops" away
    opacity: { delay: 1.55, duration: 0.45 },
  };

  return (
    <button
      type="button"
      aria-label="Open the curtain"
      tabIndex={open ? -1 : 0}
      onClick={onOpen}
      className={`absolute inset-0 z-30 block cursor-pointer overflow-hidden ${open ? "pointer-events-none" : ""}`}
    >
      {/* Left drape */}
      <motion.span
        className="absolute inset-y-0 left-0 block w-1/2 origin-left border-r-2 border-gold shadow-[10px_0_40px_rgb(0_0_0/.55)]"
        style={velvet}
        initial={false}
        animate={{ scaleX: open ? 0.08 : 1, opacity: open ? 0 : 1 }}
        transition={panelTransition}
      />
      {/* Right drape */}
      <motion.span
        className="absolute inset-y-0 right-0 block w-1/2 origin-right border-l-2 border-gold shadow-[-10px_0_40px_rgb(0_0_0/.55)]"
        style={velvet}
        initial={false}
        animate={{ scaleX: open ? 0.08 : 1, opacity: open ? 0 : 1 }}
        transition={panelTransition}
        onAnimationComplete={() => {
          // Fires for the first (no-op) render too, so only react once opened
          if (open) onDone();
        }}
      />

      {/* Monogram on the seam + hint, fades as soon as the curtain starts to move */}
      <motion.span
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center"
        initial={false}
        animate={{ opacity: open ? 0 : 1, scale: open ? 1.08 : 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="font-script text-6xl text-gold-gradient sm:text-8xl">{monogram}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.5em] text-beige/80">Tap to open</span>
      </motion.span>

      {/* Gold curtain rod */}
      <motion.span
        className="absolute inset-x-0 top-0 z-20 block h-3 bg-gradient-to-b from-gold via-beige to-gold shadow-[0_4px_12px_rgb(0_0_0/.5)]"
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ delay: open ? 1.6 : 0, duration: 0.4 }}
      />
    </button>
  );
}

export function Hero({ settings }: { settings?: EventSettings | undefined }) {
  const reduce = useReducedMotion();
  const monogram = settings?.monogram ?? "H & M";

  const [open, setOpen] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);

  // Auto-open after a beat (or instantly for people who prefer reduced motion)
  useEffect(() => {
    if (reduce) {
      setOpen(true);
      setCurtainGone(true);
      return;
    }
    const t = window.setTimeout(() => setOpen(true), AUTO_OPEN_DELAY);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <VideoBackground src={settings?.hero_video_url} />
      <div className="hero-overlay absolute inset-0" />

      {/*
        key={open}: the content remounts the moment the curtain opens, so the
        fade-up / Typewriter / motion animations start *as the curtain parts*
        instead of finishing hidden behind it.
      */}
      <div key={open ? "open" : "closed"} className="relative z-10 px-6 text-center text-ivory">
        <p className="fade-up font-script text-6xl text-gold-gradient sm:text-8xl">{monogram}</p>
        <p className="fade-up mt-6 text-xs uppercase tracking-[0.5em] text-beige [animation-delay:.2s]">
          <Typewriter text="It's Time to Ululate" />
        </p>
        <h1 className="fade-up mt-4 text-4xl font-light leading-tight sm:text-6xl [animation-delay:.35s]">
          {settings?.couple_names ?? "Hlonipha & Mcdon"}'s
          <span className="block italic text-beige">
            {settings?.event_name ?? "Lobola Luncheon"}
          </span>
        </h1>
        <motion.div
          initial={reduce ? false : { opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Flourish className="mx-auto mt-5 h-9 w-60" />
        </motion.div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <motion.a
            href="#invitation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-shine pulse-ring min-w-44 rounded-full border border-gold bg-gold px-8 py-3 text-sm uppercase tracking-[0.2em] text-ivory"
          >
            View Invitation
          </motion.a>
          <motion.a
            href="#rsvp"
            whileHover={{
              scale: 1.05,
              backgroundColor: "color-mix(in oklab, var(--ivory) 12%, transparent)",
            }}
            whileTap={{ scale: 0.95 }}
            className="min-w-44 rounded-full border border-ivory/70 px-8 py-3 text-sm uppercase tracking-[0.2em] text-ivory backdrop-blur-sm"
          >
            RSVP Now
          </motion.a>
        </motion.div>
      </div>
      <div className="pattern-band absolute bottom-0 left-0 right-0 opacity-80" />

      {!curtainGone && (
        <Curtain
          open={open}
          monogram={monogram}
          onOpen={() => setOpen(true)}
          onDone={() => setCurtainGone(true)}
        />
      )}
    </header>
  );
}
