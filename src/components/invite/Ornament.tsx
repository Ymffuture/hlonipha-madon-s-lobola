import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEW = { once: true, margin: "-40px" } as const;

/**
 * Ornament that draws itself under every heading: the rules grow out from the
 * centre, the diamond traces in and the dots pop. Pure SVG stroke animation
 * (framer-motion pathLength), disabled for reduced-motion users.
 */
export function Ornament({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: VIEW,
          transition: { duration: 0.9, delay, ease: EASE },
        };
  const pop = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { scale: 0, opacity: 0 },
          whileInView: { scale: 1, opacity: 1 },
          viewport: VIEW,
          transition: { duration: 0.5, delay, ease: EASE },
        };
  const centered = { transformBox: "fill-box", transformOrigin: "center" } as const;

  return (
    <motion.svg viewBox="0 0 220 24" className={`mx-auto h-6 w-56 text-gold ${className}`} aria-hidden="true">
      <motion.path d="M0 12h80" stroke="currentColor" strokeWidth="1" fill="none" {...draw(0)} />
      <motion.path d="M140 12h80" stroke="currentColor" strokeWidth="1" fill="none" {...draw(0.1)} />
      <motion.path d="M110 2l10 10-10 10-10-10z" fill="none" stroke="currentColor" strokeWidth="1.4" {...draw(0.25)} />
      <motion.path d="M110 7l5 5-5 5-5-5z" fill="currentColor" {...draw(0.45)} />
      <motion.circle cx="88" cy="12" r="2" fill="currentColor" style={centered} {...pop(0.5)} />
      <motion.circle cx="132" cy="12" r="2" fill="currentColor" style={centered} {...pop(0.6)} />
      <motion.path d="M92 12c3-5 7-5 8 0M128 12c-3-5-7-5-8 0" fill="none" stroke="currentColor" strokeWidth="1" {...draw(0.35)} />
    </motion.svg>
  );
}

/**
 * Decorative flower whose six petals bloom one by one when scrolled into view,
 * then sway gently forever (CSS .floral-sway, off for reduced motion).
 */
export function Floral({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <motion.svg viewBox="0 0 120 120" className={`floral-sway text-gold ${className}`} aria-hidden="true">
      {petals.map((r, i) => (
        <motion.path
          key={r}
          d="M60 60 C50 40 55 22 60 14 C65 22 70 40 60 60Z"
          transform={`rotate(${r} 60 60)`}
          opacity={0.8}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          {...(reduce
            ? {}
            : {
                initial: { pathLength: 0, opacity: 0 },
                whileInView: { pathLength: 1, opacity: 0.8 },
                viewport: VIEW,
                transition: { duration: 1.1, delay: i * 0.12, ease: EASE },
              })}
        />
      ))}
      <motion.circle
        cx="60"
        cy="60"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        {...(reduce
          ? {}
          : {
              initial: { scale: 0, opacity: 0 },
              whileInView: { scale: 1, opacity: 1 },
              viewport: VIEW,
              transition: { duration: 0.6, delay: 0.7, ease: EASE },
            })}
      />
      <circle cx="60" cy="60" r="2.5" fill="currentColor" />
    </motion.svg>
  );
}

/** Hand-drawn flourish that traces itself under the hero heading. */
export function Flourish({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const draw = (delay: number, duration = 1) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: VIEW,
          transition: { duration, delay, ease: EASE },
        };
  return (
    <motion.svg viewBox="0 0 240 40" fill="none" stroke="currentColor" className={`text-gold ${className}`} aria-hidden="true">
      <motion.path d="M10 22 C60 6 180 6 230 22" strokeWidth="1.2" {...draw(0.4)} />
      <motion.path d="M34 31 C82 18 158 18 206 31" strokeWidth="1" {...draw(0.65, 0.9)} />
      <motion.path
        d="M120 12 c-3-6 -12-6 -12 1 c0 6 12 12 12 12 s12-6 12-12 c0-7 -9-7 -12-1z"
        fill="currentColor"
        stroke="none"
        {...(reduce
          ? {}
          : {
              initial: { scale: 0, opacity: 0 },
              whileInView: { scale: 1, opacity: 1 },
              viewport: VIEW,
              transition: { duration: 0.5, delay: 1, ease: EASE },
            })}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />
    </motion.svg>
  );
}

export function SectionTitle({ eyebrow, title, light = false }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-gold">{eyebrow}</p>
      <h2 className={`mt-3 text-4xl font-medium sm:text-5xl ${light ? "text-ivory" : "text-foreground"}`}>{title}</h2>
      <Ornament className="mt-4" />
    </div>
  );
}
