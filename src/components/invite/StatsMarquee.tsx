import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { trackVisit } from "@/lib/visits";
import { getIecProgress, type IecProgress } from "@/lib/iec";
import { getWeddingNews, type NewsItem } from "@/lib/news";

type Item = { id: string; label: string; value: string; href?: string };

/** Duplicated aria rows in the scrolling track are decorative; hide them. */
const ARIA_HIDDEN = { "aria-hidden": true } as const;

/**
 * Premium footer stats ticker.
 *
 * UX contract:
 * - Never blocks first paint: skeleton shimmer until data lands.
 * - Motion is opt-out (prefers-reduced-motion → static, centered wrap).
 * - Pauses on hover/focus (read the stats at your leisure) and when the
 *   footer scrolls offscreen or the tab is hidden (zero wasted GPU).
 * - Links are focusable only in the visible copy; the duplicate track
 *   copy is aria-hidden AND tabindex-negative.
 *
 * Performance contract:
 * - CSS transform animation, not JS — composited, 60fps, no React churn.
 * - One IntersectionObserver, one visibilitychange listener, cleaned up.
 * - Both track copies are key-stable; adding news never restarts the loop
 *   (animation is driven by CSS, content by React — they don't fight).
 */
export function StatsMarquee({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const regionRef = useRef<HTMLElement>(null);

const [visitors, setVisitors] = useState<number | null>(null);
  const [iec, setIec] = useState<IecProgress | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [failed, setFailed] = useState(false);

useEffect(() => {
    let cancelled = false;
    // Parallel fetch; the strip renders whatever lands, in stream order,
    // then settles into its final order — no spinner, no jarring swap.
    const guard = <T,>(fn: (v: T) => void) => (v: T) => { if (!cancelled) fn(v); };

Promise.all([
      trackVisit().then((s) => s && guard(setVisitors)(Number(s.unique_visitors))),
      getIecProgress().then(guard(setIec)).catch(() => setFailed((f) => !cancelled && f)),
      getWeddingNews().then(guard(setNews)).catch(() => {}),
    ]).catch(() => !cancelled && setFailed(true));

return () => { cancelled = true; };
  }, []);

/**
   * Pause the CSS animation when offscreen or tab-hidden.
   * Toggling a data attribute avoids re-rendering the (long) track.
   */
  useEffect(() => {
    const el = regionRef.current;
    if (!el || reduce) return;

const io = new IntersectionObserver(
      ([entry]) => el.dataset.running = String(entry.isIntersecting && !document.hidden),
      { threshold: 0 },
    );
    const onVis = () => {
      if (!el.dataset.running) return;
      el.dataset.running = String(!document.hidden);
    };
    io.observe(el);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [reduce]);

const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (visitors !== null) {
      out.push({
        id: "visitors",
        label: visitors === 1 ? "visitor" : "visitors",
        value: visitors.toLocaleString("en-ZA"),
      });
    }
    if (iec) {
      out.push({ id: "iec-percent", label: "IEC results in", value: `${iec.percent}%` });
      out.push({
        id: "iec-vds",
        label: "voting districts reported",
        value: `${iec.vdsIn.toLocaleString("en-ZA")} / ${iec.vdsTotal.toLocaleString("en-ZA")}`,
      });
    }
    news.forEach((n, i) =>
      out.push({ id: `news-${i}`, label: `${n.title} · ${n.source}`, value: "Wedding news", href: n.url }),
    );
    return out;
  }, [visitors, iec, news]);

const loading = visitors === null && !iec && news.length === 0 && !failed;

// ------------------------------------------------------------------ render

if (loading) {
    return (
      <div
        className={`relative overflow-hidden border-t border-gold/30 bg-black/40 py-3 backdrop-blur-sm ${className}`}
      >
        <div className="stats-marquee flex items-center gap-x-10 px-6" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="stats-shimmer h-4 w-16 rounded-sm bg-gold/30" />
              <span className="stats-shimmer h-2 w-24 rounded-sm bg-beige/20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

if (items.length === 0) return null;

const renderItem = (it: Item, decorative: boolean) => {
    const body = (
      <>
        <span className="font-display text-xl text-gold-gradient tabular-nums">{it.value}</span>
        <span className="text-[11px] uppercase tracking-[0.3em] text-beige/80">{it.label}</span>
      </>
    );
    return (
      <li key={it.id} className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
        {it.href ? (
          <a
            href={it.href}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={decorative ? -1 : undefined}
            className="flex items-baseline gap-2 rounded-sm underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-gold"
          >
            {body}
          </a>
        ) : (
          body
        )}
        <span className="ml-10 text-gold/60" aria-hidden="true">◆</span>
      </li>
    );
  };

const row = (decorative: boolean, wrap = false) => (
    <ul
      className={`flex items-center gap-x-10 gap-y-2 ${
        wrap ? "flex-wrap justify-center px-6" : "shrink-0 pr-10"
      }`}
      aria-hidden={decorative || undefined}
    >
      {items.map((it) => renderItem(it, decorative))}
    </ul>
  );

return (
    <section
      ref={regionRef}
      data-running="true"
      className={`group relative overflow-hidden border-t border-gold/30 bg-black/40 py-3 backdrop-blur-sm ${className}`}
      aria-label="Site and election statistics"
    >
      {reduce ? (
        <div className="flex justify-center">{row(false, true)}</div>
      ) : (
        <>
          {/* Visible focus trap boundary so keyboard users can "hold" the strip */}
          <div
            className="stats-marquee-mask pointer-events-none absolute inset-0 z-10"
            aria-hidden="true"
          />
          <div className="stats-marquee flex w-max items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            {row(false)}
            {row(true)}
          </div>
        </>
      )}
    </section>
  );
}
