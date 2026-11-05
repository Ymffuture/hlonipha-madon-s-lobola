import { createServerFn } from "@tanstack/react-start";

/**
 * Wedding headlines from NewsAPI, fetched on the server so the API key stays
 * out of the browser bundle. Set NEWS_API_KEY in the server environment.
 *
 * NewsAPI's free plan allows ~100 requests/day, so the result is cached in
 * memory for 3 hours and shared by every visitor.
 */
export type NewsItem = { title: string; url: string; source: string };

const CACHE_MS = 3 * 60 * 60 * 1000;
const DAYS_BACK = 31; // "this month and last": roughly the latest month of coverage
const MAX_ITEMS = 6;

let cache: { at: number; items: NewsItem[] } | null = null;

type Article = { title?: string | null; url?: string | null; source?: { name?: string | null } };

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const getWeddingNews = createServerFn({ method: "GET" }).handler(async (): Promise<NewsItem[]> => {
  const key = process.env["NEWS_API_KEY"];
  if (!key) return [];
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;

  try {
    const from = isoDay(new Date(Date.now() - DAYS_BACK * 86_400_000));
    const params = new URLSearchParams({
      q: '"wedding" OR "weddings"',
      from,
      language: "en",
      sortBy: "popularity", // "best" = most popular; use "publishedAt" for newest first
      pageSize: "20",
    });
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      headers: { "X-Api-Key": key }, // header instead of ?apiKey= so it never lands in URLs or logs
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const data = (await res.json()) as { articles?: Article[] };

    const seen = new Set<string>();
    const items: NewsItem[] = [];
    for (const a of data.articles ?? []) {
      const title = a.title?.trim();
      const url = a.url?.trim();
      if (!title || !url || title === "[Removed]" || !/^https?:\/\//.test(url)) continue;
      const k = title.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      items.push({
        title: title.length > 90 ? `${title.slice(0, 87).trimEnd()}…` : title,
        url,
        source: a.source?.name?.trim() || "News",
      });
      if (items.length >= MAX_ITEMS) break;
    }
    cache = { at: Date.now(), items };
    return items;
  } catch (e) {
    console.warn("[news] wedding headlines unavailable:", e);
    return cache?.items ?? []; // serve stale headlines rather than nothing
  }
});
