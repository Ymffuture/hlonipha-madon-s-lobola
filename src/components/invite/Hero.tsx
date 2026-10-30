import type { EventSettings } from "@/lib/event";
import { motion, useReducedMotion } from "framer-motion";
import { Typewriter } from "./Motion";
import { Flourish } from "./Ornament";
import { VideoBackground } from "./VideoBackground";

export function Hero({ settings }: { settings?: EventSettings | undefined }) {
  const reduce = useReducedMotion();
  return (
    <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <VideoBackground src={settings?.hero_video_url} />
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 px-6 text-center text-ivory">
        <p className="fade-up font-script text-6xl text-gold-gradient sm:text-8xl">{settings?.monogram ?? "H & M"}</p>
        <p className="fade-up mt-6 text-xs uppercase tracking-[0.5em] text-beige [animation-delay:.2s]">
          <Typewriter text="It's Time to Ululate" />
        </p>
        <h1 className="fade-up mt-4 text-4xl font-light leading-tight sm:text-6xl [animation-delay:.35s]">
          {settings?.couple_names ?? "Hlonipha & Mcdon"}'s
          <span className="block italic text-beige">{settings?.event_name ?? "Lobola Luncheon"}</span>
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
            whileHover={{ scale: 1.05, backgroundColor: "color-mix(in oklab, var(--ivory) 12%, transparent)" }}
            whileTap={{ scale: 0.95 }}
            className="min-w-44 rounded-full border border-ivory/70 px-8 py-3 text-sm uppercase tracking-[0.2em] text-ivory backdrop-blur-sm"
          >
            RSVP Now
          </motion.a>
        </motion.div>
      </div>
      <div className="pattern-band absolute bottom-0 left-0 right-0 opacity-80" />
    </header>
  );
}
