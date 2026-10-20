import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Ornament } from "@/components/invite/Ornament";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — H & M Lobola" },
      { name: "description", content: "Administrator sign in for H & M's Lobola Luncheon invitation." },
      { property: "og:title", content: "Admin sign in — H & M Lobola" },
      { property: "og:description", content: "Administrator sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState("");

  // Go to /admin as soon as a session exists (already signed in, or just back from the OAuth redirect)
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/admin", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) navigate({ to: "/admin", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Supabase sends OAuth failures back as ?error_description=... on the redirect URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
    const desc = params.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));
  }, []);

  async function signIn(provider: "google" | "apple") {
    setBusy(provider);
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (err) {
      // e.g. "Unsupported provider: provider is not enabled" -> provider not switched on in Supabase
      setError(err.message || "Sign in failed. Please try again.");
      setBusy(null);
    }
    // On success the browser is redirected to the provider, so nothing else to do here.
  }

  const btn = "flex w-full items-center justify-center gap-3 rounded-full border border-input bg-background px-6 py-3 text-sm font-medium transition hover:border-gold disabled:opacity-60";
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <p className="font-script text-5xl text-gold">H &amp; M</p>
        <h1 className="mt-2 text-3xl">Administrator</h1>
        <Ornament className="my-4" />
        <p className="mb-6 text-sm text-muted-foreground">Only authorised administrators can access the guest dashboard. Guests do not need an account to RSVP.</p>
        <div className="space-y-3">
          <button className={btn} disabled={!!busy} onClick={() => signIn("google")}>
            {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="font-bold text-gold">G</span>} Continue with Google
          </button>
          <button className={btn} disabled={!!busy} onClick={() => signIn("apple")}>
            {busy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden="true"></span>} Continue with Apple
          </button>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline">← Back to invitation</Link>
      </div>
    </main>
  );
}
