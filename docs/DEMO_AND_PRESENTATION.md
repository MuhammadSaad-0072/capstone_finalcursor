# Demo walkthrough and presentation support

## One-minute project explanation

SignalDesk helps students and beginner traders make sense of fragmented market
information by placing dated daily price history, transparent technical
indicators, and a plain-language explanation in one learning workspace. It
also lets them rehearse decisions with a hypothetical portfolio. Next.js
provides the web UI and server API, Alpha Vantage supplies optional daily
history, Gemini optionally explains selected metrics, and Supabase Auth/Postgres
stores private paper trades. If provider credentials are not configured, the
app visibly switches to synthetic data, a rules explanation, and
browser-local demo trades. It never connects to a broker or offers guaranteed
advice.

## Feature-by-feature evaluator script

1. **Show the market overview.** Point out the selected ticker, source badge,
   latest data date, and daily-price label. Explain that demo data is synthetic
   and that live-source mode means a provider response—not real-time execution
   pricing.
2. **Search and switch assets.** Search a supported stock/ETF, select it, and
   show that the chart and statistics update. In the no-key environment, use
   one of the demo catalog assets.
3. **Explain the indicators.** Show SMA20, SMA50, and RSI14; describe them as
   summaries of historical closes. Open methodology and call out the
   limitations notice.
4. **Request an explanation.** Select “Explain this asset.” Show the provider
   label and the input list. Without Gemini credentials the rule-based output
   is explicitly identified; with Gemini configured it is labeled AI.
5. **Record a paper trade.** Enter a small buy quantity and submit. Show the
   virtual balance, derived open position, fill price, and activity history.
   Use a sell only for shares already held.
6. **Show persistence boundaries.** In demo mode, explain that history is
   browser-local. With Supabase configured, sign in and show the same user's
   saved trades after refresh; explain that the table uses RLS.
7. **Close with safety.** Emphasize the $100,000 virtual starting balance,
   daily-close pricing, no broker connection, and non-advisory/uncertain AI
   output.

## Likely evaluator questions

**Does the app place trades?**

No. There is no broker account integration or order endpoint. All orders are
hypothetical ledger entries.

**Are the dashboard prices real-time?**

No. The provider integration uses daily historical closes. The UI displays the
source and latest observation date; provider delays and quotas still apply.

**What happens without API keys?**

The app remains demonstrable in labeled demo mode using synthetic prices,
rule-based explanations, and browser-local trades. Those values are not real
market observations and demo trades are not database-persistent.

**How does the AI decide what to say?**

The server sends only the chosen ticker, latest daily close, one-day change,
SMA20/SMA50, and RSI14. The prompt limits the response to those facts and
rejects buy/sell recommendations or claims of certainty. The model can still
be wrong.

**How are private portfolios protected?**

Supabase Auth provides the identity; an RLS policy scopes reads to
`auth.uid()`. Direct user inserts are revoked. After verifying the user's
session, the server uses a server-only service-role key to call a tightly
scoped Postgres function that validates cash and position. That elevated key
is never sent to the browser.

**How accurate are the indicators?**

They use documented formulas on the returned close series. They describe past
prices only; they are not predictive guarantees or recommendations.

**What would be the next improvement?**

Add automated RLS policy tests and persistent rate limiting, expand observability
without recording secrets, verify data licensing for a wider audience, and
consider more asset classes only after establishing a data source and
entitlements for each.
