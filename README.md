# SignalDesk — AI Trading Education

SignalDesk is a Vercel-ready capstone for learning how to interpret daily market
prices and technical indicators. It includes a responsive market dashboard,
plain-language explanations, and a hypothetical paper portfolio. It never
connects to a brokerage, sends real orders, or guarantees a forecast.

## Start locally

Requirements: Node.js 20.9 or newer and npm.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). With no environment values,
the app starts in **Demo mode** using synthetic, clearly labelled sample data,
a rule-based explanation, and browser-local paper trades. Browser demo trades
are stored only on that device and are not a substitute for database persistence.

## Configure hosted services

1. Create a Supabase project. Run
   [`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql)
   in its SQL Editor. Copy the project URL and publishable/anon key into
   `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Add the project's server-only
   service-role key as `SUPABASE_SERVICE_ROLE_KEY` for the narrowly scoped
   paper-trade write function. Never expose it in a `NEXT_PUBLIC_*` variable.
   Configure email/password auth and the `/auth/callback` redirect URL for
   localhost and your deployed site.
2. Create an Alpha Vantage API key and set `ALPHA_VANTAGE_API_KEY` to retrieve
   daily historical prices and asset search results. The provider currently
   documents a standard limit of 25 requests per day; responses are cached to
   reduce requests. Verify the current limit and data entitlements before a
   public demo.
3. Optionally create a Google AI Studio API key and set `GEMINI_API_KEY`.
   `GEMINI_MODEL` is optional; if omitted, the server uses its configured
   default. Supabase Auth must be configured and the user must be signed in
   before a keyed Gemini request is made. Without the key or authenticated
   setup, or if the AI API fails, a clearly identified local rule-based
   explanation is returned. AI requests contain only the selected symbol and
   market metrics, never credentials or portfolio history.
4. Add the same server-side environment variables to the Vercel project. Do
   not add secrets to `NEXT_PUBLIC_*` variables or commit `.env.local`.

Copy only variable names from [`.env.example`](./.env.example); never paste
credentials into source files or chat.

## Main capabilities

- Search for supported stocks and ETFs; show the source, last data date, and
  staleness status alongside a historical close chart and market statistics.
- Calculate SMA20, SMA50, and Wilder RSI14 with visible values and methodology.
- Generate an AI explanation from a bounded set of visible market inputs, with
  a non-AI fallback when the provider is not configured or unavailable.
- Record hypothetical buys and sells against a virtual $100,000 starting
  balance. In a configured Supabase project, signed-in trades are stored in
  Postgres and protected by row-level security. The demo fallback uses
  `localStorage` and is explicitly browser-only.

## Project references

- [Project proposal and technical research](./docs/PROJECT_PROPOSAL.md)
- [Architecture, data model, and security](./docs/ARCHITECTURE.md)
- [REST API reference](./docs/API.md)
- [Demo walkthrough and evaluator Q&A](./docs/DEMO_AND_PRESENTATION.md)

## Limitations

- Alpha Vantage provides daily history here, not guaranteed real-time quotes.
  Free usage limits may be reached; provider status, market calendars, data
  licensing, and plan terms can change.
- Demo asset prices and history are synthetic and must never be described as
  actual market data.
- Indicator calculations are educational summaries of past closes. They do not
  forecast price direction.
- AI output is probabilistic and may be inaccurate. It is informational only.
- Paper trades are hypothetical; the application has no broker integration.
- Without Supabase credentials, paper-trading records stay in the current
  browser. Persistent private portfolios require the Supabase setup above.

## Deploy to Vercel

Import the project into Vercel with the repository root as the project root.
Vercel detects Next.js automatically. Add server-side environment variables in
Project Settings, deploy, then set the production and preview callback URLs in
Supabase Auth. Run a production build locally with `npm run build` before
deploying.

## Official references

- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase pricing and plan limits](https://supabase.com/pricing)
- [Alpha Vantage API documentation](https://www.alphavantage.co/documentation/)
- [Alpha Vantage usage limit](https://www.alphavantage.co/premium/)
- [Google Gemini API getting started](https://ai.google.dev/gemini-api/docs/get-started?lang=node)
- [Google Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Recharts guide](https://recharts.github.io/en-US/guide/)

Research checked 17 October 2026. Provider pricing, quotas, model names, and
terms can change; use each provider's current dashboard and documentation.
