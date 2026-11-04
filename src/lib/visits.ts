import { callRpc } from "./rpc";

export type VisitStats = { total_visits: number; unique_visitors: number };

const SESSION_KEY = "hm_visit_counted"; // once per browser tab session: refreshes don't count again
const VISITOR_KEY = "hm_visitor"; // once per browser: makes the "unique visitors" number

function safeGet(store: Storage | undefined, key: string) {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
function safeSet(store: Storage | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    /* private mode / blocked storage: just skip */
  }
}

let inflight: Promise<VisitStats | null> | null = null;

/**
 * Counts this visit (at most once per session) and resolves with the latest
 * numbers. Safe to call from several components or twice in React StrictMode:
 * the module-level promise makes sure only one request is sent.
 */
export function trackVisit(): Promise<VisitStats | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (inflight) return inflight;

  const alreadyCounted = safeGet(window.sessionStorage, SESSION_KEY) === "1";
  const isBot = typeof navigator !== "undefined" && navigator.webdriver === true;

  inflight = (async () => {
    if (alreadyCounted || isBot) {
      const { data, error } = await callRpc<VisitStats>("get_visit_stats");
      if (error) console.warn("[visits] get_visit_stats failed:", error.message);
      return data;
    }
    const isNewVisitor = safeGet(window.localStorage, VISITOR_KEY) === null;
    safeSet(window.sessionStorage, SESSION_KEY, "1");
    const { data, error } = await callRpc<VisitStats>("record_visit", {
      _new_visitor: isNewVisitor,
    });
    if (error) {
      // Not counted, so let the next page load try again instead of waiting for a new session.
      console.warn("[visits] record_visit failed:", error.message);
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      return null;
    }
    safeSet(window.localStorage, VISITOR_KEY, "1");
    return data;
  })().catch((e) => {
    console.warn("[visits] unexpected error:", e);
    return null;
  });

  return inflight;
}
