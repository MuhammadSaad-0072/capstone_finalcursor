# API reference

All endpoints are same-origin Next.js Route Handlers. JSON errors use the form
`{ "error": "human-readable message" }`. Credentials are never accepted in
request bodies.

## Market search

`GET /api/market/search?query=apple`

Returns `{ "results": [{ "symbol": "AAPL", "name": "Apple Inc.", "type": "Equity", "region": "United States" }] }`.

The query is trimmed and capped at 40 characters. With Alpha Vantage
configured, the server proxies provider search. In demo mode, a small fixed
catalog is searched. Provider quota/availability errors return `502`.

## Market series and analysis

`GET /api/market?symbol=NVDA`

Returns:

```json
{
  "asset": { "symbol": "NVDA", "name": "NVIDIA Corporation" },
  "source": {
    "mode": "demo",
    "provider": "Synthetic demo data",
    "asOf": "2026-10-16",
    "stale": false
  },
  "price": 182,
  "change": 1.23,
  "changePercent": 0.68,
  "points": [{ "date": "2026-10-16", "close": 182, "volume": 38000000 }],
  "stats": { "high": 184, "low": 151, "averageVolume": 35000000 },
  "indicators": { "sma20": 177.5, "sma50": 168.25, "rsi14": 57.2 }
}
```

The values above illustrate the response shape; demo series are generated at
runtime. `mode` is `live` only when Alpha Vantage returns valid daily data. The
latest price in this response is the most recent daily close, not a guaranteed
real-time quote. Invalid symbols return `400`; unavailable provider data
returns an explicit `502`.

## AI explanation

`POST /api/explain`

Request:

```json
{ "symbol": "NVDA" }
```

Returns the selected implementation mode, provider label, summary, exact
considered inputs, and a caution notice. `mode` is `ai` when Gemini returns
text; `rules` identifies the deterministic fallback. The API accepts no free
form prompt and no portfolio data.

## Authentication

### `GET /api/auth/session`

Returns `{ "mode": "demo", "user": null }` without Supabase configuration, or
`{ "mode": "supabase", "user": { "email": "…" } }` when an authenticated user
exists.

### `POST /api/auth/signup` and `POST /api/auth/signin`

Request:

```json
{ "email": "student@example.com", "password": "at-least-8-characters" }
```

Signup returns whether email confirmation is required. Sign-in uses a
cookie-backed Supabase session. The configured callback URL is
`/auth/callback`.

### `POST /api/auth/signout`

Revokes the current Supabase session. Demo mode returns a successful no-op
response.

## Paper trading

### `GET /api/trades`

Returns up to 200 newest trades for the signed-in user when Supabase is
configured. Without database credentials the response identifies demo mode;
demo trades are loaded from browser storage by the UI.

### `POST /api/trades`

Request:

```json
{ "symbol": "NVDA", "side": "buy", "quantity": 2 }
```

The server validates the request and reads the latest available daily close.
The caller cannot submit a price or `user_id`. The authenticated Postgres
function checks available virtual cash for a buy or shares held for a sell,
then inserts the ledger row. Successful database trades return `201` and the
stored row. Unsigned users receive `401`; insufficient cash/position or
invalid input returns `400`.

No endpoint submits an exchange or brokerage order.
