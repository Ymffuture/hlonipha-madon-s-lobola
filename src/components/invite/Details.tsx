import { CalendarDays, Clock, MapPin, Shirt, Phone, Navigation } from "lucide-react";
import { formatEventDate, mapsUrl, type EventSettings } from "@/lib/event";
import { Countdown } from "./Countdown";
import { CountdownBackground } from "./CountdownBackground";
import { Floral, SectionTitle } from "./Ornament";

export function Details({ settings }: { settings: EventSettings }) {
  const { date, time } = formatEventDate(settings.event_datetime);
  const items = [
    { icon: CalendarDays, label: "Date", value: date },
    { icon: Clock, label: "Time", value: time },
    { icon: MapPin, label: "Venue", value: settings.venue },
    { icon: Shirt, label: "Dress code", value: settings.dress_code },
    { icon: Phone, label: "RSVP contact", value: settings.rsvp_contact, href: `tel:${settings.rsvp_contact.replace(/\s/g, "")}` },
  ];
  return (
    <>
      <section id="invitation" className="relative scroll-mt-4 px-6 py-24">
        <Floral className="absolute left-4 top-10 h-24 w-24 opacity-40 sm:h-32 sm:w-32" />
        <Floral className="absolute bottom-10 right-4 h-24 w-24 opacity-40 sm:h-32 sm:w-32" />
        <div className="mx-auto max-w-2xl text-center">
          <SectionTitle eyebrow="Xi Amukeriwa · You are welcome" title="Love, Family & Tradition" />
          <p className="whitespace-pre-line font-display text-xl leading-relaxed text-foreground/90 sm:text-2xl">{settings.welcome_message}</p>
          <p className="mt-8 font-script text-4xl text-gold">{settings.couple_names}</p>
        </div>
      </section>

      <CountdownBackground className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <SectionTitle eyebrow="Counting down" title="Until We Celebrate" light />
          <Countdown iso={settings.event_datetime} />
          <p className="mt-4 text-center text-xs text-ivory/80">South Africa Standard Time (Johannesburg)</p>
        </div>
      </CountdownBackground>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <SectionTitle eyebrow="The details" title={settings.event_name} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
                <Icon className="mx-auto h-6 w-6 text-gold" aria-hidden="true" />
                <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
                {href ? (
                  <a href={href} className="mt-2 block font-display text-xl text-foreground underline-offset-4 hover:underline">{value}</a>
                ) : (
                  <p className="mt-2 font-display text-xl text-foreground">{value}</p>
                )}
              </div>
            ))}
            <a
              href={mapsUrl(settings.venue)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-primary p-6 text-primary-foreground shadow-card transition hover:brightness-110"
            >
              <Navigation className="h-6 w-6 text-gold" aria-hidden="true" />
              <span className="text-sm uppercase tracking-[0.25em]">Get Directions</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
