import { Cake, Gift, Heart, Music, PartyPopper, Smile, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

type Item = {
  Icon: LucideIcon;
  x: number;
  size: number;
  dur: number;
  delay: number;
  sway: number;
  tone: string;
};

// Fixed values (no Math.random) so server and browser render the same markup.
const ITEMS: Item[] = [
  { Icon: PartyPopper, x: 6, size: 30, dur: 17, delay: -2, sway: 30, tone: "text-gold" },
  { Icon: Heart, x: 15, size: 22, dur: 21, delay: -9, sway: -24, tone: "text-gold/70" },
  { Icon: Smile, x: 24, size: 28, dur: 19, delay: -14, sway: 20, tone: "text-primary/50" },
  { Icon: Sparkles, x: 33, size: 20, dur: 15, delay: -5, sway: -18, tone: "text-gold" },
  { Icon: Gift, x: 42, size: 26, dur: 23, delay: -17, sway: 26, tone: "text-primary/45" },
  { Icon: Star, x: 51, size: 18, dur: 16, delay: -11, sway: -22, tone: "text-gold/80" },
  { Icon: Music, x: 60, size: 24, dur: 20, delay: -4, sway: 28, tone: "text-primary/50" },
  { Icon: Cake, x: 69, size: 28, dur: 22, delay: -13, sway: -30, tone: "text-gold/70" },
  { Icon: Smile, x: 77, size: 22, dur: 18, delay: -7, sway: 18, tone: "text-gold" },
  { Icon: Heart, x: 85, size: 26, dur: 24, delay: -19, sway: -26, tone: "text-gold/80" },
  { Icon: PartyPopper, x: 93, size: 24, dur: 16, delay: -1, sway: 22, tone: "text-primary/45" },
  { Icon: Sparkles, x: 11, size: 16, dur: 14, delay: -12, sway: 16, tone: "text-gold/70" },
  { Icon: Star, x: 47, size: 16, dur: 19, delay: -16, sway: 14, tone: "text-gold" },
  { Icon: Sparkles, x: 89, size: 18, dur: 17, delay: -8, sway: -16, tone: "text-gold/70" },
];

/** Decorative icons that drift up behind the page. Hidden for reduced-motion users. */
export function CelebrationFloaters() {
  return (
    <div
      aria-hidden="true"
      className="celebrate-layer pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {ITEMS.map(({ Icon, x, size, dur, delay, sway, tone }, i) => (
        <span
          key={i}
          className={`celebrate-float ${tone}`}
          style={
            {
              "--x": `${x}%`,
              "--dur": `${dur}s`,
              "--delay": `${delay}s`,
              "--sway": `${sway}px`,
            } as CSSProperties
          }
        >
          <Icon
            className="drop-shadow-sm"
            {...({ style: { width: size, height: size } } as object)}
          />
        </span>
      ))}
    </div>
  );
}
