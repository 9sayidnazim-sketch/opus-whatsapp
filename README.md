# OPUS by Octapus

Household finance dashboard for transactions, bills, budgets, goals and family members. The text assistant runs Claude Sonnet 4.6 through MWAPI. Supabase Auth and row-level security protect account records.

## Run

Copy `.env.example` to `.env.local`, configure the values, and run `npm ci` then `npm run dev`. Apply the SQL in `supabase/migrations` to a dedicated Supabase project. Set the Supabase Auth Site URL to the deployed site. Production API functions run on Vercel.

Only the Supabase publishable key, Supabase URL and WhatsApp business number may be exposed to the browser. Keep the Supabase secret key, MWAPI credential, Kapso credential and webhook secret server-side.

## Passkeys (Face ID / Touch ID)

Members sign in with their MPIN, then enroll a passkey from **Admin > Passkeys & Biometrics** (or right after creating an account). Later they can sign in with the passkey alone.

To turn it on in production:

1. Apply `supabase/migrations/202611150007_passkeys.sql`. It creates `opus_passkeys` (credentials) and `opus_passkey_challenges` (single-use, five-minute challenges), both with row-level security. Members can list and revoke their own passkeys; only the server can enroll a passkey, update its counter or touch challenges.
2. In Vercel, set `SUPABASE_SECRET_KEY` (Supabase dashboard > Project Settings > API Keys, a `sb_secret_...` key; the legacy `service_role` key also works as `SUPABASE_SERVICE_ROLE_KEY`) next to `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Mark it sensitive and never give it a `VITE_` prefix.
3. Redeploy. `vercel.json` routes `/api/webauthn/:action` to `api/webauthn.js`.

How it works: enrollment requires the member's Supabase access token, which the server checks with Supabase Auth, so nobody can add a passkey to someone else's account. At sign-in the server checks the passkey's signature against a challenge it issued, then creates a normal Supabase session by generating a one-time magic-link token for that member and exchanging it immediately. No email is sent. Unknown, revoked or forged passkeys, and replayed or expired challenges, are rejected. If the secret key is missing, passkey requests return 503 and MPIN sign-in keeps working.

A passkey only works on the domain where it was enrolled, so one enrolled on a preview URL won't sign in on the production domain. Every passkey sign-in exchanges its token from Vercel's servers, so busy households can hit the Supabase Auth limit on token verifications; raise it under Authentication > Rate Limits if needed.

Without Supabase variables, `npm run dev` uses the local mock: passkeys are kept in `server/.webauthn_store.json` (git-ignored) and anyone can enroll under any username. That mode never runs on Vercel. `npm test` exercises both modes with a software authenticator.

## WhatsApp

Register a signed Kapso v2 `whatsapp.message.received` webhook at `/api/whatsapp` for the configured phone-number ID. Insert the SHA-256 hex digest of the webhook secret into `opus_private.whatsapp_config` through the Supabase SQL editor. Use a high-entropy secret. In OPUS, select **Chat on WhatsApp** from Assistant or Notifications and send the prefilled greeting and 10-digit chat ID. New links must be confirmed within 10 minutes. After linking, ask finance questions or send `OPUS expense 25 groceries` or `OPUS income 100 refund`. Your latest 10 assistant exchanges across web and WhatsApp can inform replies across both channels.

Transaction commands record against the linked user only. Claude answers text questions and does not perform account edits. Scheduled WhatsApp alerts and voice messages are not implemented.
