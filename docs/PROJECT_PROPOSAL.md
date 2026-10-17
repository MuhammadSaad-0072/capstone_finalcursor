# Project proposal

## Title

**SignalDesk: AI-Assisted Trading Education and Paper Portfolio**

## Abstract

SignalDesk is an educational decision-support web application for students and
beginner investors. It brings together a selected asset's daily price history,
basic technical indicators, and a bounded plain-language explanation. Users
can record hypothetical buys and sells in a private paper portfolio. The
application does not connect to a brokerage, place orders, or claim to predict
markets.

## Problem statement

Beginners often encounter prices, charts, technical indicators, and market
commentary in separate interfaces, with unfamiliar terms and little
explanation of how a displayed signal was calculated. This fragmentation makes
it harder to understand what an observation means and what data informed it.
SignalDesk gathers a small, documented set of daily market data and indicators,
explains them in plain language, and provides a paper-only workflow to practice
recording hypothetical decisions. It is a learning aid—not a broker, trading
system, personalized adviser, or reliable prediction of future prices.

## Purpose and objectives

1. Present dated, sourced daily price observations and basic statistics.
2. Calculate SMA20, SMA50, and RSI14 consistently from historical closes.
3. Explain those exact inputs in understandable language, with AI clearly
   identified when used and a labelled deterministic fallback otherwise.
4. Let a user practice buys and sells against a fixed virtual cash balance.
5. Demonstrate a production-shaped frontend, server API, authentication,
   relational persistence, and Vercel deployment path.

## Target users and use cases

- **Primary — students and beginner traders:** learn how to read a price chart
  and indicator values; compare market observations; record practice decisions
  without committing real capital.
- **Secondary — educators and evaluators:** inspect the source timestamp,
  indicator method, generated explanation inputs, API boundaries, database
  protections, and end-to-end demo workflow.

The scope is a focused stock/ETF learning tool. It does not attempt to serve
professional traders, execute trades, recommend securities, or replace
licensed financial advice.

## Proposed solution

The dashboard lets users search supported symbols, review daily closing
history, see a chart and current available statistics, inspect moving averages
and RSI, and request an explanation tied to those displayed inputs. Paper
orders store a server-calculated daily close as the hypothetical fill price.
With Supabase configured, authentication and row-level security protect each
user's database history. Without credentials, the app remains demonstrable
using clearly labelled synthetic data, rule-based explanations, and
browser-local paper trades.

## Scope and limitations

**In scope:** responsive dashboard; stock/ETF search; historical daily price
series; SMA20/SMA50/RSI14; optional Gemini text explanation; private paper-trade
ledger; virtual cash/positions/history; demo mode; Vercel deployment; setup and
presentation documentation.

**Out of scope:** brokerage or exchange connectivity; live order routing;
portfolio advice; guaranteed forecasts; real-time or tick-level prices;
options, derivatives, crypto, or international-market coverage guarantees;
tax, suitability, or regulatory determinations.

## Recommended technology and rationale

| Area | Selection | Rationale |
| --- | --- | --- |
| Frontend | Next.js App Router, React, TypeScript | A single deployable web app with server-rendered routing and typed client UI. Next.js Route Handlers provide an API surface in the same project. |
| Charts | Recharts | React-native chart components fit the daily series and allow responsive, accessible-enough custom presentation without a separate chart service. |
| Styling | Tailwind v4 build pipeline plus custom CSS design tokens and responsive component styles | A small capstone can maintain one consistent visual system without introducing a large UI framework. |
| Backend | Next.js Route Handlers, Zod validation | Keeps provider calls and secrets on the server, colocated with the frontend, and validates untrusted request data. |
| Market data | Alpha Vantage daily time series and symbol search | The official API documentation covers daily stock history and ticker search. The app labels the last daily close rather than implying live execution prices. |
| AI | Google Gemini API, optional | Used only to explain a small, server-constructed set of market values. An explicit local rules explanation works when no API key is configured or the service fails. |
| Database and auth | Supabase Postgres and Supabase Auth | Managed relational persistence and email/password authentication fit the user-owned ledger. Row Level Security limits records to their owner. |
| Hosting | Vercel for the Next.js application; Supabase-hosted Postgres/Auth | Both have documented Next.js and server-side workflows. Secrets are configured in server runtime environment variables. |

## Research, constraints, and setup

Official sources were checked on 17 October 2026:

- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
  document `route.ts` request handlers in the App Router; this project uses
  them for market, analysis, authentication, and trade APIs.
- [Vercel's Next.js guide](https://vercel.com/docs/frameworks/full-stack/nextjs)
  documents Next.js as a supported framework. Server functions have platform
  limits; check the current [Vercel Function limits](https://vercel.com/docs/functions/limitations)
  and plan before expanding workloads.
- [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
  uses cookie-based sessions; [password Auth](https://supabase.com/docs/guides/auth/passwords)
  requires the deployment's callback URL to be configured. The [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
  recommends enabling RLS and restricting grants/policies for exposed tables.
- [Supabase pricing](https://supabase.com/pricing) currently lists a free plan
  and describes free-project inactivity pausing; quotas and plan terms can
  change. A deployed capstone should be checked periodically to ensure its
  project is active.
- [Alpha Vantage documentation](https://www.alphavantage.co/documentation/)
  describes daily series and symbol search. The [usage page](https://www.alphavantage.co/premium/)
  currently states a standard limit of 25 requests/day; cache responses and
  verify quotas, data entitlements, and redistribution terms before a public
  demonstration.
- [Gemini getting started](https://ai.google.dev/gemini-api/docs/get-started?lang=node)
  requires an API key and demonstrates the JavaScript SDK. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
  vary by model and project and are visible in AI Studio; check the current
  quota and billing settings before enabling the key. This app only uses a
  configured key for a signed-in Supabase user.
- [Recharts installation and guide](https://recharts.github.io/en-US/guide/)
  documents the React charting package used for the close-price series.

No account, API key, paid plan, or external credential is assumed to exist. The
default development experience is synthetic demo mode. Supabase credentials
are needed for private database persistence; Alpha Vantage is needed for
provider-backed market history; Gemini is optional. Free-tier eligibility,
quotas, inactive-project policies, current model names, API terms, and market
data entitlements must be checked in the relevant account before deployment.

## Assumptions

- A $100,000 virtual cash balance is used for the paper-trading exercise.
- A paper fill uses the server's latest available daily close, not an intraday
  execution price.
- The initial provider integration focuses on common US stock/ETF symbols.
- Demo mode intentionally stores trades in the current browser only; it is not
  presented as database persistence.
- AI explains past observations only; it is not asked for buy/sell
  recommendations or price targets.
