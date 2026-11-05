import { createServerFn } from "@tanstack/react-start";

/**
 * IEC (Electoral Commission of South Africa) results progress, fetched on the
 * server so the browser never calls api.elections.org.za directly (avoids CORS
 * and keeps any API token out of the client bundle).
 *
 * Optional environment variables (server side only):
 *   IEC_API_TOKEN        Bearer token, only if the IEC issued you one
 *   IEC_ELECTORAL_EVENT  Electoral event ID for the 2026 LGE. If it is not set,
 *                        the active event is looked up from api/v1/ElectoralEvent.
 */
const BASE = "https://api.elections.org.za";

export type IecProgress = {
  /** Voting districts whose results are in, and the total number of districts */
  vdsIn: number;
  vdsTotal: number;
  percent: number;
};

type Json = Record<string, unknown>;

async function iecGet(path: string): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env['IEC_API_TOKEN'];
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/${path}`, { headers, signal: AbortSignal.timeout(6_000) });
  if (!res.ok) throw new Error(`IEC ${path} -> ${res.status}`);
  return res.json();
}

/** Case-insensitive lookup of the first key that matches any of the candidates. */
function pick(obj: Json | undefined, ...names: string[]): unknown {
  if (!obj) return undefined;
  const keys = Object.keys(obj);
  for (const n of names) {
    const k = keys.find((x) => x.toLowerCase() === n.toLowerCase());
    if (k !== undefined) return obj[k];
  }
  return undefined;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(/\s/g, "")) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Responses may be an object, an array of one object, or wrapped in a property. */
function firstObject(data: unknown): Json | undefined {
  if (Array.isArray(data)) return firstObject(data[0]);
  if (data && typeof data === "object") return data as Json;
  return undefined;
}

export const getIecProgress = createServerFn({ method: "GET" }).handler(
  async (): Promise<IecProgress | null> => {
    try {
      const eventId = process.env['IEC_ELECTORAL_EVENT'];
      if (!eventId) return null; // set IEC_ELECTORAL_EVENT once you know the 2026 LGE event ID

      const raw = await iecGet(`api/v1/ResultsProgress?ElectoralEventID=${encodeURIComponent(eventId)}`);
      const o = firstObject(raw);
      const vdsIn = num(pick(o, "VDResultsIn", "VotingDistrictResultsIn", "VDsIn", "ResultsIn"));
      const vdsTotal = num(pick(o, "VDTotal", "VotingDistrictTotal", "VDsTotal", "Total"));
      if (vdsIn === null || vdsTotal === null || vdsTotal <= 0) return null;
      return { vdsIn, vdsTotal, percent: Math.min(100, Math.round((vdsIn / vdsTotal) * 1000) / 10) };
    } catch (e) {
      console.warn("[iec] results progress unavailable:", e);
      return null; // the marquee just leaves this item out
    }
  },
);
