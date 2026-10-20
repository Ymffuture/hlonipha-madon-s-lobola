import type { ReactNode } from "react";
import { VideoBackground } from "./VideoBackground";

/** Section wrapper: looping video behind the children, with a scrim for legibility. */
export function CountdownBackground({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`relative isolate overflow-hidden ${className}`}>
      <div className="absolute inset-0 -z-10">
        <VideoBackground pauseOffscreen />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      {children}
    </section>
  );
}
