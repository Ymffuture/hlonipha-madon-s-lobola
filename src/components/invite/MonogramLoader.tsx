import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";
const SIZES: Record<Size, string> = { sm: "w-28", md: "w-44", lg: "w-56" };

/**
 * Animated "H & M" monogram drawn as pure SVG strokes (no font needed, so it
 * renders instantly). Each glyph draws itself in, holds, then erases, looping.
 * Animation lives in styles.css (.monogram-*) and is disabled for users who
 * prefer reduced motion.
 */
export function MonogramLoader({
  label = "Loading…",
  size = "md",
  className,
}: {
  label?: string;
  size?: Size;
  className?: string;
}) {
  // pathLength="1" normalises every path so one dash value animates all of them.
  const glyph = { pathLength: 1, className: "monogram-stroke", fill: "none" } as const;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <svg
        viewBox="0 0 240 130"
        className={cn("monogram-glow text-gold", SIZES[size])}
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* H */}
        <path {...glyph} style={{ ["--d" as string]: "0s" }} d="M22 22 V82 M62 22 V82 M22 52 H62" />
        {/* & */}
        <path
          {...glyph}
          style={{ ["--d" as string]: "0.35s" }}
          d="M138 84 L108 46 C100 36 106 24 116 24 C126 24 130 36 122 46 L106 64 C98 74 104 84 116 84 C126 84 134 76 140 66"
        />
        {/* M */}
        <path
          {...glyph}
          style={{ ["--d" as string]: "0.7s" }}
          d="M170 82 V22 L195 58 L220 22 V82"
        />
        {/* underline + diamond ornament */}
        <path
          {...glyph}
          strokeWidth={2}
          style={{ ["--d" as string]: "1s" }}
          d="M50 108 H108 M132 108 H190"
        />
        <rect
          className="monogram-diamond"
          x="115"
          y="101"
          width="10"
          height="10"
          fill="currentColor"
          stroke="none"
          transform="rotate(45 120 106)"
        />
      </svg>
      <p className="font-display text-lg tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

/** Full-screen version for page-level waits (e.g. checking admin access). */
export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <MonogramLoader size="lg" label={label} />
    </main>
  );
}
