import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { trackVisit } from "@/lib/visits";
import { getIecProgress, type IecProgress } from "@/lib/iec";
import { getWeddingNews, type NewsItem } from "@/lib/news";

type Item = { label: string; value: string; href?: string };

/** Slow, endless strip of stats at the very bottom of the footer. */
export function StatsMarquee({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const [visitors, setVisitors] = useState<number | null>(null);
  const [iec, setIec] = useState<IecProgress | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    trackVisit().then((s) => !cancelled && s && setVisitors(Number(s.unique_visitors)));
    getIecProgress()
      .then((p) => !cancelled && setIec(p))
      .catch(() => {});
    getWeddingNews()
      .then((n) => !cancelled && setNews(n))
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
  for (const n of news) items.push({ value: "Wedding news", label: `${n.title} · ${n.source}`, href: n.url });
  if (items.length === 0) return null;

  const row = (hidden: boolean, wrap = false) => (
    <ul
      className={`flex items-center gap-x-10 gap-y-2 ${wrap ? "flex-wrap justify-center px-6" : "shrink-0 pr-10"}`}
      aria-hidden={hidden || undefined}
    >
      {items.map((it, i) => {
        const body = (
          <>
            <span className="font-display text-xl text-gold-gradient tabular-nums">{it.value}</span>
            <span className="text-[11px] uppercase tracking-[0.3em] text-beige/80">{it.label}</span>
          </>
        );
        return (
          <li key={`${i}-${it.label}`} className="flex items-baseline gap-2 whitespace-nowrap">
            {it.href ? (
              <a
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={hidden ? -1 : undefined}
                className="flex items-baseline gap-2 underline-offset-4 hover:underline"
              >
                {body}
              </a>
            ) : (
              body
            )}
            {!wrap && <span className="ml-10 text-gold/60" aria-hidden="true">◆</span>}
          </li>
        );
      })}
    </ul>
  );

  return (
    <marquee 
      className={`relative overflow-hidden border-t border-gold/30 bg-black/40 py-3 backdrop-blur-sm ${className}`}
      role="region"
      aria-label="Site and election statistics"
    >
      {reduce ? (
        <div className="flex justify-center">{row(false, true)}</div>
      ) : (
        <div className="stats-marquee flex w-max">
          {row(false)}
          {row(true)}
        </marquee>
      )}
    </div>
  );
}
