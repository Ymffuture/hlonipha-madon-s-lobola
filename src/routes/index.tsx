import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { applyTheme, eventSettingsQuery } from "@/lib/event";
import { Hero } from "@/components/invite/Hero";
import { Details } from "@/components/invite/Details";
import { RsvpForm } from "@/components/invite/RsvpForm";
import { Footer } from "@/components/invite/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H & M — Hlonipha & Mcdon's Lobola Luncheon" },
      { name: "description", content: "It's time to ululate! Join Hlonipha & Mcdon for their traditional Xitsonga Lobola Luncheon on 22 December 2026 in Xihoko Village, Tzaneen. RSVP online." },
      { property: "og:title", content: "H & M — It's Time to Ululate" },
      { property: "og:description", content: "Hlonipha & Mcdon's Lobola Luncheon · 22 December 2026 · Xihoko Village, Tzaneen. RSVP online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data, isLoading, isError, refetch } = useQuery(eventSettingsQuery());
  useEffect(() => {
    if (data) applyTheme(data);
  }, [data]);

  return (
    <main>
      <Hero settings={data} />
      {isLoading && (
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-24">
          <Skeleton className="mx-auto h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {isError && (
        <div className="px-6 py-24 text-center">
          <p className="text-muted-foreground">We couldn't load the invitation details.</p>
          <button onClick={() => refetch()} className="mt-4 rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground">Try again</button>
        </div>
      )}
      {data && (
        <>
          <Details settings={data} />
          <RsvpForm maxGuests={data.max_guests} />
        </>
      )}
      <Footer settings={data} />
    </main>
  );
}
