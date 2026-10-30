import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { VolumeX, Waves } from "lucide-react";
import oceanUrl from "@/assets/ocean-loop.mp3";

const TARGET_VOLUME = 0.35;

/**
 * Floating toggle for a soft looping ocean/nature soundtrack. Browsers block
 * autoplay, so nothing plays until the guest taps the button; audio is only
 * created on first use and fades in gently.
 */
export function AmbientSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) a.pause();
      else if (playing) void a.play().catch(() => setPlaying(false));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [playing]);

  const toggle = () => {
    if (!audioRef.current) {
      const a = new Audio(oceanUrl);
      a.loop = true;
      a.preload = "none";
      a.volume = 0;
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    a.volume = 0;
    void a
      .play()
      .then(() => {
        setPlaying(true);
        let v = 0;
        const id = window.setInterval(() => {
          v = Math.min(TARGET_VOLUME, v + 0.05);
          a.volume = v;
          if (v >= TARGET_VOLUME) window.clearInterval(id);
        }, 100);
      })
      .catch(() => setPlaying(false));
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? "Turn nature sounds off" : "Play ocean nature sounds"}
      title={playing ? "Mute nature sounds" : "Play ocean sounds"}
      initial={false}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 bg-cocoa/90 text-gold shadow-card backdrop-blur-sm"
    >
      {playing ? (
        <Waves className="h-5 w-5 animate-pulse" aria-hidden="true" />
      ) : (
        <VolumeX className="h-5 w-5" aria-hidden="true" />
      )}
    </motion.button>
  );
}
