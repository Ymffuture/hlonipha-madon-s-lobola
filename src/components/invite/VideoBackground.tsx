import { useEffect, useRef, useState } from "react";

export const DEFAULT_VIDEO = "/hero-loop.mp4";
export const DEFAULT_POSTER = "/hero-poster.jpg";

type Props = {
  src?: string | null | undefined;
  poster?: string;
  className?: string;
  /** Pause when scrolled off-screen (good for lower sections). */
  pauseOffscreen?: boolean;
};

/**
 * Absolutely-positioned looping muted video with a poster image underneath.
 * - If a custom `src` fails (404, bad URL), it falls back to the bundled DEFAULT_VIDEO.
 * - Respects prefers-reduced-motion (poster only).
 */
export function VideoBackground({
  src,
  poster = DEFAULT_POSTER,
  className = "",
  pauseOffscreen = false,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const wanted = src?.trim() || DEFAULT_VIDEO;
  const [current, setCurrent] = useState(wanted);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setCurrent(wanted);
    setFailed(false);
  }, [wanted]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // iOS/Safari only autoplay muted videos
    v.play().catch(() => {});
    if (!pauseOffscreen) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e) return;
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.1 });
    io.observe(v);
    return () => io.disconnect();
  }, [current, failed, reduced, pauseOffscreen]);

  const onError = () => {
    if (current !== DEFAULT_VIDEO) setCurrent(DEFAULT_VIDEO);
    else setFailed(true);
  };

  return (
    <>
      <img src={poster} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover ${className}`} />
      {!failed && !reduced && (
        <video
          ref={ref}
          key={current}
          className={`absolute inset-0 h-full w-full object-cover ${className}`}
          src={current}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={onError}
        />
      )}
    </>
  );
}
