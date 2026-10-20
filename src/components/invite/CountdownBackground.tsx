import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** Video served from /public (Vite serves it at the site root). */
  src?: string;
  poster?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Section wrapper that plays a muted, looping video behind its children.
 * - Falls back to the poster image if the video errors or the user prefers reduced motion.
 * - Only plays while on screen (IntersectionObserver) to save battery/data on mobile.
 */
export function CountdownBackground({
  src = "/countdown-loop.mp4",
  poster = "/countdown-poster.jpg",
  className = "",
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Pause when off-screen, play when visible
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // required for autoplay on iOS/Safari
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.1 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [failed, reduced]);

  return (
    <section className={`relative isolate overflow-hidden ${className}`}>
      <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      {!failed && !reduced && (
        <video
          ref={videoRef}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      )}
      {/* Dark scrim keeps the numbers readable over any frame */}
      <div className="absolute inset-0 -z-10 bg-black/55" />
      {children}
    </section>
  );
}
