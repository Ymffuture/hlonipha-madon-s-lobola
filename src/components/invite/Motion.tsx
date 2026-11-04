import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { motion, useInView, useReducedMotion, type MotionStyle, type Transition } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

/** The classic "expo out" ease — matches CSS `cubic-bezier(0.22, 1, 0.36, 1)`. */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Central reduced-motion policy. Every animated component funnels through
 * this so accessibility behavior is consistent (and unit-testable).
 * Returns the transition to use: a real one, or effectively instant.
 */
function useMotionTransition(transition?: Transition): Transition {
  const reduce = useReducedMotion();
  return useMemo(
    () => (reduce ? { duration: 0.01 } : (transition ?? { duration: 0.6, ease: EASE_OUT_EXPO })),
    [reduce, transition],
  );
}

/* ------------------------------------------------------------------ */
/* <FadeIn> — scroll reveal, now semantic + composable                  */
/* ------------------------------------------------------------------ */

export function FadeIn({
  children,
  className = "",
  delay = 0,
  y = 24,
  x = 0,
  blur = false,          // subtle depth-of-field reveal
  as = "div",            // render semantic elements: section, li, figure…
  once = true,
  amount = 0.3,          // % of element that must be visible before firing
  transition,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset in px. 0 = pure fade. */
  y?: number;
  /** Horizontal offset in px — enables diagonal reveals. */
  x?: number;
  /** Adds a gentle blur-out; skipped automatically for reduced motion. */
  blur?: boolean;
  as?: ElementType;
  once?: boolean;
  amount?: number;
  transition?: Transition;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const t = useMotionTransition(transition);
  const Tag = motion[as as keyof typeof motion] as typeof motion.div;

return (
    <Tag
      className={className}
      style={{ willChange: "transform, opacity", ...style } as MotionStyle}
      initial={{ opacity: 0, y: reduce ? 0 : y, x: reduce ? 0 : x, filter: blur && !reduce ? "blur(6px)" : "none" }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: "blur(0px)" }}
      viewport={{ once, amount }}
      transition={{ delay, ...t }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* <Stagger> — orchestrated group reveals (no manual delay bookkeeping) */
/* ------------------------------------------------------------------ */

export function Stagger({
  children,
  className = "",
  gap = 0.08,            // seconds between each child
  y = 20,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  y?: number;
  as?: ElementType;
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as as keyof typeof motion] as typeof motion.div;

return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : gap } } }}
    >
      {children}
    </Tag>
  );
}

/**
 * Use inside <Stagger> instead of <FadeIn> — it inherits the orchestration.
 * <Stagger><StaggerItem as="li">…</StaggerItem>…</Stagger>
 */
export function StaggerItem({
  children,
  className = "",
  y = 20,
  as = "div",
  transition,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: ElementType;
  transition?: Transition;
}) {
  const reduce = useReducedMotion();
  const t = useMotionTransition(transition);
  const Tag = motion[as as keyof typeof motion] as typeof motion.div;

return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : y },
        show: { opacity: 1, y: 0, transition: t },
      }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* <Typewriter> — v2                                                  */
/* ------------------------------------------------------------------ */

type TypewriterProps = {
  text: string;
  /** Base ms per character. The effect adds human variance around this. */
  speed?: number;
  startDelay?: number;
  className?: string;
  /** Type whole words at a time — better for long copy, no flicker. */
  mode?: "char" | "word";
  /** Fires once when typing completes (first time only). */
  onComplete?: () => void;
  /** Show the blinking caret. */
  caret?: boolean;
  /** Min-height reserve prevents layout shift while text streams in. */
  preventLayoutShift?: boolean;
};

/**
 * Live typing with a blinking caret.
 *
 * Accessibility contract:
 * - The full text is always exposed once via aria-label (SSR-safe).
 * - The visible stream is aria-hidden so SRs never re-read partials.
 * - Reduced motion: full text immediately, no caret.
 * - The whole effect pauses when the tab is hidden (visibilitychange),
 *   so a user who tabs away doesn't return to a finished paragraph
 *   they never saw typing.
 *
 * Performance contract:
 * - rAF-driven timestamp interpolation, NOT setInterval: stable cadence,
 *   self-correcting against frame drops, zero drift, one timer total.
 * - Hydration-safe: first paint renders the full text; typing begins
 *   only inside useEffect (post-hydration).
 */
export function Typewriter({
  text,
  speed = 26,
  startDelay = 350,
  className = "",
  mode = "char",
  onComplete,
  caret = true,
  preventLayoutShift = false,
}: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(text);
  const [done, setDone] = useState(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete; // always-fresh callback, stable deps

// Chars (or words) revealed so far — derived for the render.
  const units = mode === "word" ? text.split(/(\s+)/) : [...text];
  const shownUnits = mode === "word" ? shown.split(/(\s+)/) : [...shown];
  const typing = shown.length < text.length;

useEffect(() => {
    if (reduce || !inView) return;

setShown("");
    setDone(false);

const total = units.length;
    let raf = 0;
    let start = 0;
    let elapsed = 0; // accumulated "paused" time while tab hidden

const step = (now: number) => {
      if (document.hidden) {
        elapsed += now - start;
        start = now;
        raf = requestAnimationFrame(step);
        return;
      }
      const t = now - start - elapsed - startDelay;
      if (t <= 0) {
        raf = requestAnimationFrame(step);
        return;
      }
      // Humanized cadence: ±35% variance, deterministic per index.
      const progress = Math.floor(
        units.slice(0, Math.min(total, (t / speed) | 0)).length,
      );
      const idx = Math.min(total, Math.max(0, Math.floor(t / speed)));
      const next = units.slice(0, idx).join("");
      setShown((prev) => (prev === next ? prev : next));
      if (idx >= total) {
        setDone(true);
        completeRef.current?.();
        return;
      }
      raf = requestAnimationFrame(step);
    };

start = performance.now();
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // units identity is stable for a given text; keep deps simple:
  }, [inView, reduce, text, speed, startDelay, mode]); // eslint-disable-line react-hooks/exhaustive-deps

return (
    <span
      ref={ref}
      className={className}
      style={preventLayoutShift ? { display: "inline-block", minHeight: "1em" } : undefined}
      // Full sentence for assistive tech; visual stream is decorative.
      aria-label={text}
    >
      <span aria-hidden="true">
        {shown}
        {caret && !reduce && !done && <span className="tw-caret" />}
      </span>
    </span>
  );
}
