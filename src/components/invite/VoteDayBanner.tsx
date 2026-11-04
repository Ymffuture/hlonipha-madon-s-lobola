import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Vote } from "lucide-react";
import { TIMEZONE } from "@/lib/event";

/**
 * Local Government Elections banner. It switches itself on and off by the clock
 * (South African time), so there is nothing to remove afterwards.
 */
const VOTE_DAY = {
  date: "2026-11-04", // election day
  showFrom: 7 * 60, // banner appears 07:00 ...
  // ... and disappears by itself at midnight, when the date changes.
  stationsOpen: 7 * 60, // IEC: voting stations open 07:00
  stationsClose: 21 * 60, // IEC: voting stations close 21:00
};

function jhbClock() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

type State = "open" | "closed" | null;

function currentState(): State {
  const { date, minutes } = jhbClock();
  if (date !== VOTE_DAY.date || minutes < VOTE_DAY.showFrom) return null;
  return minutes >= VOTE_DAY.stationsOpen && minutes < VOTE_DAY.stationsClose ? "open" : "closed";
}

export function VoteDayBanner() {
  // null on the server and first render, so server and browser markup always match
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    setState(currentState());
    const id = setInterval(() => setState(currentState()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!state) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      className="mb-8 rounded-xl border border-gold bg-black/45 px-5 py-5 text-center text-ivory shadow-card backdrop-blur-md"
    >
      <div className="flex items-center justify-center gap-3">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          {state === "open" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          )}
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${state === "open" ? "bg-gold" : "bg-beige/60"}`}
          />
        </span>
        <Vote className="h-6 w-6 text-gold" aria-hidden="true" />
        <p className="text-xs uppercase tracking-[0.35em] text-gold">
          Voting Day · 4 November 2026
        </p>
      </div>

      <p className="mt-3 font-display text-2xl italic text-gold-gradient sm:text-3xl">
        Local Government Elections
      </p>

      {state === "open" ? (
        <>
          <p className="mt-2 text-sm text-ivory/90">
            Voting stations are open today from 07:00 to 21:00. Remember to bring your ID.
          </p>
          <a
            href="https://maps.elections.org.za/vsfinder/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs uppercase tracking-[0.25em] text-beige underline-offset-4 hover:underline"
          >
            Find your voting station
          </a>
        </>
      ) : (
        <p className="mt-2 text-sm text-ivory/90">
          Voting stations have closed for the day. Thank you to everyone who voted.
        </p>
      )}
    </motion.div>
  );
}
