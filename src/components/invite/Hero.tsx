import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hero-loop.mp4.asset.json";
import heroPoster from "@/assets/hero-poster.jpg.asset.json";
import type { EventSettings } from "@/lib/event";

export function Hero({ settings }: { settings?: EventSettings | undefined }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const src = settings?.hero_video_url?.trim() || heroVideo.url;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setFailed(false);
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [src]);

  return (
    <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <img src={heroPoster.url} alt="" className="absolute inset-0 h-full w-full object-cover" width={1600} height={900} />
      {!failed && !reduced && (
        <video
          ref={videoRef}
          key={src}
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          poster={heroPoster.url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      )}
      <div className="hero-overlay absolute inset-0" />
      <div className="relative z-10 px-6 text-center text-ivory">
        <p className="fade-up font-script text-6xl text-gold-gradient sm:text-8xl">{settings?.monogram ?? "H & M"}</p>
        <p className="fade-up mt-6 text-xs uppercase tracking-[0.5em] text-beige [animation-delay:.2s]">It's Time to Ululate</p>
        <h1 className="fade-up mt-4 text-4xl font-light leading-tight sm:text-6xl [animation-delay:.35s]">
          {settings?.couple_names ?? "Hlonipha & Madon"}'s
          <span className="block italic text-beige">{settings?.event_name ?? "Lobola Luncheon"}</span>
        </h1>
        <div className="fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:.5s]">
          <a href="#invitation" className="min-w-44 rounded-full border border-gold bg-gold px-8 py-3 text-sm uppercase tracking-[0.2em] text-ivory transition hover:brightness-110">
            View Invitation
          </a>
          <a href="#rsvp" className="min-w-44 rounded-full border border-ivory/70 px-8 py-3 text-sm uppercase tracking-[0.2em] text-ivory backdrop-blur-sm transition hover:bg-ivory/10">
            RSVP Now
          </a>
        </div>
      </div>
      <div className="pattern-band absolute bottom-0 left-0 right-0 opacity-80" />
    </header>
  );
}
