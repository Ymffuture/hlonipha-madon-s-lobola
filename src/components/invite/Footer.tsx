import { Link } from "@tanstack/react-router";
import footerImg from "@/assets/couple-footer.jpg.asset.json";
import type { EventSettings } from "@/lib/event";

export function Footer({ settings }: { settings?: EventSettings }) {
  return (
    <footer className="relative overflow-hidden text-ivory">
      <img src={footerImg.url} alt="Hlonipha and Madon smiling together" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[center_70%]" width={1400} height={1900} />
      <div className="footer-overlay absolute inset-0" />
      <div className="pattern-band relative" />
      <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
        <p className="font-script text-6xl text-gold-gradient">{settings?.monogram ?? "H & M"}</p>
        <p className="mt-4 font-display text-2xl italic">Two families, one heart.</p>
        <p className="mt-6 text-xs uppercase tracking-[0.35em] text-beige">22 · 12 · 2026 · Tzaneen</p>
        {settings && (
          <a href={`tel:${settings.rsvp_contact.replace(/\s/g, "")}`} className="mt-6 inline-block text-sm text-beige underline-offset-4 hover:underline">
            RSVP enquiries: {settings.rsvp_contact}
          </a>
        )}
        <div className="mt-10">
          <Link to="/admin" className="text-[11px] uppercase tracking-[0.3em] text-beige/60 hover:text-beige">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
