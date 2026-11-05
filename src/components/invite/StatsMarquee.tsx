import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { trackVisit } from "@/lib/visits";
import { getIecProgress, type IecProgress } from "@/lib/iec";

type Item = { label: string; value: string };

/** Slow, endless strip of stats at the very bottom of the footer. */
export function StatsMarquee({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [visitors, setVisitors] = useState<number | null>(null);
  const [iec, setIec] = useState<IecProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    trackVisit().then((s) => !cancelled && s && setVisitors(Number(s.unique_visitors)));
    getIecProgress()
      .then((p) => !cancelled && setIec(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items: Item[] = [];
  if (visitors !== null) items.push({ label: visitors === 1 ? "visitor" : "visitors", value: visitors.toLocaleString("en-ZA") });
  if (iec) {
    items.push({ label: "IEC results in", value: `${iec.percent}%` });
    items.push({ label: "voting districts reported", value: `${iec.vdsIn.toLocaleString("en-ZA")} / ${iec.vdsTotal.toLocaleString("en-ZA")}` });
  }
  if (items.length === 0) return null;

  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <li key={it.label} className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="font-display text-xl text-gold-gradient tabular-nums">{it.value}</span>
          <span className="text-[11px] uppercase tracking-[0.3em] text-beige/80">{it.label}</span>
          <span className="ml-10 text-gold/60" aria-hidden="true">◆</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={`relative overflow-hidden border-t border-gold/30 bg-black/40 py-3 backdrop-blur-sm ${className}`}
      role="region"
      aria-label="Site and election statistics"
    >
      {reduce ? (
        <div className="flex justify-center">{row(false)}</div>
      ) : (
        <div className="stats-marquee flex w-max">
          {row(false)}
          {row(true)}
        </div>
      )}
    </div>
  );
}
