import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { trackVisit } from "@/lib/visits";

/** Counts the visit, then shows "N visitors" with a count-up animation. Renders nothing until the number is known (or if it fails). */
export function VisitorCounter({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [target, setTarget] = useState<number | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;
    trackVisit().then((stats) => {
      if (!cancelled && stats) setTarget(Number(stats.unique_visitors));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (target === null) return;
    if (reduce) {
      setShown(target);
      return;
    }
    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, reduce]);

  if (target === null) return null;

  return (
    <p
      className={`text-xs uppercase tracking-[0.3em] text-beige/80 ${className}`}
      aria-label={`${target} visitors so far`}
    >
      <span className="font-display text-2xl tracking-normal text-gold-gradient tabular-nums">
        {shown.toLocaleString("en-ZA")}
      </span>
      <span className="ml-2">{target === 1 ? "visitor" : "visitors"}</span>
    </p>
  );
}
