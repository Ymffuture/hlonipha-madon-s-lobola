import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  Smile,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Ornament } from "@/components/invite/Ornament";
import { CelebrationFloaters } from "@/components/invite/CelebrationFloaters";
import { MonogramLoader } from "@/components/invite/MonogramLoader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — H & M Lobola" },
      {
        name: "description",
        content: "Administrator sign in for H & M's Lobola Luncheon invitation.",
      },
      { property: "og:title", content: "Admin sign in — H & M Lobola" },
      { property: "og:description", content: "Administrator sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

/** Official four-colour Google "G" as inline SVG (no network request, crisp at any size). */
function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const LAST_EMAIL_KEY = "hm-admin-last-email";

function readLastEmail(): string | null {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY);
  } catch {
    return null;
  }
}
function writeLastEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
    else localStorage.removeItem(LAST_EMAIL_KEY);
  } catch {
    /* private mode etc. - the hint is only a convenience */
  }
}

/** Google refuses OAuth inside embedded browsers (WhatsApp, Instagram, Facebook, TikTok…) with "disallowed_useragent". */
function isEmbeddedBrowser() {
  const ua = navigator.userAgent;
  const iosWebView = /(iPhone|iPad|iPod)/.test(ua) && !/Safari/.test(ua);
  return (
    iosWebView ||
    /(FBAN|FBAV|Instagram|Snapchat|TikTok|musical_ly|MicroMessenger|LinkedInApp|Line\/|; wv\))/i.test(
      ua,
    )
  );
}

/** Turn raw Supabase/Google errors into something an admin can act on. */
function friendlyError(raw: string) {
  const m = raw.toLowerCase();
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google sign-in isn't switched on yet. In Supabase: Authentication → Providers → Google → enable it.";
  if (m.includes("redirect"))
    return "This address isn't an allowed redirect URL in Supabase (Authentication → URL Configuration).";
  if (m.includes("access_denied") || m.includes("access denied"))
    return "Sign-in was cancelled. Tap the button to try again.";
  if (m.includes("disallowed_useragent"))
    return "Google blocks sign-in inside this app. Open this page in Chrome or Safari.";
  if (m.includes("fetch") || m.includes("network"))
    return "Couldn't reach the server. Check your connection and try again.";
  return raw || "Sign in failed. Please try again.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false); // just came back from Google, waiting for the session
  const [error, setError] = useState("");
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [embedded, setEmbedded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Browser-only checks (kept out of the first render so server and client markup match).
  useEffect(() => {
    setLastEmail(readLastEmail());
    setEmbedded(isEmbeddedBrowser());
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    // Coming back with the browser's Back button can restore a stuck "busy" page from cache.
    const reset = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  // Go to /admin as soon as a session exists, and remember which Google account was used.
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(
      window.location.search + "&" + window.location.hash.replace(/^#/, ""),
    );
    const returning = params.has("code") || params.has("access_token");
    if (returning) setFinishing(true);

    const go = (email?: string | null) => {
      if (email) writeLastEmail(email);
      navigate({ to: "/admin", replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) go(data.session.user.email);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go(session.user.email);
    });
    // If Google sent us back but no session ever appears, stop the spinner and say so.
    const timeout = returning
      ? setTimeout(() => {
          if (!active) return;
          setFinishing(false);
          setError((e) => e || "Sign-in didn't finish. Please try again.");
        }, 10000)
      : undefined;
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  // Supabase sends OAuth failures back as ?error_description=... on the redirect URL
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search + "&" + window.location.hash.replace(/^#/, ""),
    );
    const desc = params.get("error_description");
    if (desc) {
      setError(friendlyError(desc.replace(/\+/g, " ")));
      setFinishing(false);
    }
  }, []);

  async function signInWithGoogle() {
    if (!navigator.onLine) {
      setError("You're offline. Reconnect and try again.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
        // Known admin account -> Google pre-selects it; otherwise always show the account chooser.
        queryParams: lastEmail ? { login_hint: lastEmail } : { prompt: "select_account" },
      },
    });
    if (err) {
      setError(friendlyError(err.message));
      setBusy(false);
    }
    // On success the browser is redirected to Google, so nothing else to do here.
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Long-press the address bar to copy the link.");
    }
  }

  if (finishing)
    return (
      <main className="relative flex min-h-screen items-center justify-center px-6">
        <CelebrationFloaters />
        <div className="relative z-10">
          <MonogramLoader size="lg" label="Signing you in…" />
        </div>
      </main>
    );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10">
      <CelebrationFloaters />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-gold">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="font-script text-5xl text-gold">H &amp; M</p>
        <h1 className="mt-2 flex items-center justify-center gap-2 text-3xl">
          Administrator <Smile className="h-6 w-6 text-gold" aria-hidden="true" />
        </h1>
        <Ornament className="my-4" />
        <p className="mb-6 text-sm text-muted-foreground">
          Only authorised administrators can access the guest dashboard. Guests do not need an
          account to RSVP.
        </p>

        {embedded && (
          <div className="mb-4 rounded-xl border border-gold/40 bg-secondary p-3 text-left text-xs text-foreground">
            <p>Google doesn't allow sign-in inside this app. Open this page in Chrome or Safari.</p>
            <button
              onClick={copyLink}
              className="mt-2 inline-flex items-center gap-1.5 font-medium text-gold underline-offset-4 hover:underline"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={busy || !online}
          className="group flex w-full items-center justify-center gap-3 rounded-full border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm transition hover:border-gold hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-gold" aria-hidden="true" />
          ) : (
            <GoogleLogo />
          )}
          <span className="truncate">
            {busy
              ? "Opening Google…"
              : lastEmail
                ? `Continue as ${lastEmail}`
                : "Continue with Google"}
          </span>
        </button>

        {lastEmail && !busy && (
          <button
            onClick={() => {
              writeLastEmail(null);
              setLastEmail(null);
            }}
            className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Use a different Google account
          </button>
        )}

        {!online && (
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> You're offline
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Secure sign-in handled by Google
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to invitation
        </Link>
      </div>

      <p className="relative z-10 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Layers className="h-4 w-4 text-gold" aria-hidden="true" />
        Powered by <span className="font-semibold tracking-wide text-gold">SumStack</span>
      </p>
    </main>
  );
}
