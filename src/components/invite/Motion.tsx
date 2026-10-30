import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Fade-and-rise reveal when the block scrolls into view. */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Live typing effect: characters appear one by one (with a blinking caret)
 * once the text scrolls into view. Screen readers get the full sentence via
 * aria-label, and reduced-motion users see the complete text immediately.
 */
export function Typewriter({
  text,
  speed = 26,
  startDelay = 350,
  className = "",
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  // Server and first client paint render the full text, so hydration matches;
  // typing starts as a post-hydration update.
  const [shown, setShown] = useState(text);
  const typing = shown.length < text.length;

  useEffect(() => {
    if (reduce || !inView) return;
    setShown("");
    let i = 0;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length && interval) window.clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
    };
  }, [inView, text, speed, startDelay, reduce]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">
        {shown}
        {!reduce && (
          <span className="tw-caret" style={{ visibility: typing ? "visible" : "hidden" }} />
        )}
      </span>
    </span>
  );
}
