# Connect your own Supabase project

## 1. Create the project and tables
1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/20261020000000_lobola_schema.sql`, and **Run** it (run it once only).
   - Creates `rsvps`, `event_settings`, `user_roles`, the `has_role()` and `submit_rsvp()` functions and all RLS policies.
   - Makes **futurekgomotso@gmail.com** the admin automatically when that Google account signs in.
     To use a different admin email, change it in the two places it appears in that file *before* running.

## 2. Environment variables
Copy `.env.example` to `.env` and fill in the values from **Project Settings → API**
(Project URL and the anon/publishable key). Add the same variables in your host (Vercel/Cloudflare/etc.).
Never put the `service_role` key in a `VITE_` variable.

## 3. Turn on Google sign-in
1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
   Authorised redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. Supabase → **Authentication → Providers → Google**: enable it and paste the Client ID and Secret.
3. Supabase → **Authentication → URL Configuration**:
   - Site URL: your live site URL
   - Redirect URLs: add `https://YOUR-SITE/auth` and `http://localhost:8080/auth` (use your local dev port)

Apple sign-in additionally needs a paid Apple Developer account; if it is not configured the button shows
Supabase's "provider is not enabled" message. Remove the Apple button in `src/routes/auth.tsx` if you do not need it.

## 4. Check it works
Open `/auth`, continue with the admin Google account, and you should land on `/admin`.
- "Could not check access" → the SQL in step 1 has not been run on this project.
- "Not authorised" → you signed in with an email that is not the admin email.
