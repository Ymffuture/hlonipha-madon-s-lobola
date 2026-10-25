import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    done: ms === 0,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

/** Counts down to an absolute instant (stored with the Africa/Johannesburg offset). */
export function Countdown({ iso }: { iso: string }) {
  const target = new Date(iso).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);
  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t?.done) return <p className="text-center font-display text-3xl italic text-gold">The celebration has begun — Ku tsakile!</p>;

  const units = [
    ["Days", t?.days],
    ["Hours", t?.hours],
    ["Minutes", t?.minutes],
    ["Seconds", t?.seconds],
  ] as const;
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
      {units.map(([label, v], i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-ivory/30 bg-black/30 px-2 py-4 text-center text-ivory shadow-card backdrop-blur-md"
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
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-beige sm:text-xs">{label}</div>
        </motion.div>
      ))}
    </div>
  );
}
