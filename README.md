# OPUS by Octapus

Household finance dashboard for transactions, bills, budgets, goals and family members. The text assistant runs Claude Sonnet 4.6 through MWAPI. Supabase Auth and row-level security protect account records.

## Run

Copy `.env.example` to `.env.local`, configure the values, and run `npm ci` then `npm run dev`. Apply the SQL in `supabase/migrations` to a dedicated Supabase project. Set the Supabase Auth Site URL to the deployed site. Production API functions run on Vercel.

Only the Supabase publishable key, Supabase URL and WhatsApp business number may be exposed to the browser. Keep the MWAPI credential, Evolution API credential and webhook secret server-side.

## WhatsApp (Evolution API)

Configure Evolution API credentials (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`) in `.env.local` or deployment environment variables. Set the Evolution API instance webhook to point to `/api/whatsapp`. In Fuloozi, select **Open in WhatsApp** or scan the instance QR code from Settings. After linking, ask finance questions or send `expense 25 groceries` or `income 100 refund`.

Transaction commands record against the linked user only. Claude answers text questions and does not perform account edits. Scheduled WhatsApp alerts and voice messages are not implemented.
