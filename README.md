# OPUS by Octapus

Household finance dashboard for transactions, bills, budgets, goals and family members. The text assistant runs Claude Sonnet 4.6 through MWAPI. Supabase Auth and row-level security protect account records.

## Run

Copy `.env.example` to `.env.local`, configure the values, and run `npm ci` then `npm run dev`. Apply the SQL in `supabase/migrations` to a dedicated Supabase project. Set the Supabase Auth Site URL to the deployed site. Production API functions run on Vercel.

Only the Supabase publishable key, Supabase URL and WhatsApp business number may be exposed to the browser. Keep the MWAPI credential, Kapso credential and webhook secret server-side.

## WhatsApp

Register a signed Kapso v2 `whatsapp.message.received` webhook at `/api/whatsapp` for the configured phone-number ID. Insert the SHA-256 hex digest of the webhook secret into `opus_private.whatsapp_config` through the Supabase SQL editor. Use a high-entropy secret. In OPUS, use Notifications → Link WhatsApp to send a one-time pairing code. Then send `OPUS expense 25 groceries`, `OPUS income 100 refund`, or prefix a finance question with `OPUS`.

Transaction commands record against the linked user only. Claude answers text questions and does not perform account edits. Scheduled WhatsApp alerts and voice messages are not implemented.
