// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// The browser can only read VITE_* variables. Vercel's Supabase integration (and this project's
// .env) use SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY, so copy those into the client bundle at
// build time. Only the public URL + publishable (anon) key are exposed - never the secret key.
const env: Record<string, string | undefined> = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const pick = (...names: string[]) => names.map((n) => env[n]).find(Boolean);
const supabaseUrl = pick("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = pick(
  "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY",
);
const clientEnv: Record<string, string> = {
  ...(supabaseUrl && { "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl) }),
  ...(supabaseKey && { "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey) }),
};

export default defineConfig({
  vite: { define: clientEnv },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
