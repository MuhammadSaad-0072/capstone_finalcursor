import "server-only";
import type {
  AssetSearchResult,
  MarketSnapshot,
  PricePoint,
} from "./types";
import { calculateIndicators } from "./indicators";

const demoAssets: AssetSearchResult[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "Equity", region: "United States" },
  { symbol: "AAPL", name: "Apple Inc.", type: "Equity", region: "United States" },
  { symbol: "MSFT", name: "Microsoft Corporation", type: "Equity", region: "United States" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "Equity", region: "United States" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", type: "Equity", region: "United States" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "Equity", region: "United States" },
  { symbol: "META", name: "Meta Platforms, Inc.", type: "Equity", region: "United States" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "ETF", region: "United States" },
];

const demoBases: Record<string, number> = {
  NVDA: 182,
  AAPL: 256,
  MSFT: 519,
  GOOGL: 243,
  AMZN: 232,
  TSLA: 438,
  META: 716,
  SPY: 668,
};

const round = (value: number, digits = 2) =>
  Number(value.toFixed(digits));

function getAssetName(symbol: string) {
  return (
    demoAssets.find((asset) => asset.symbol === symbol)?.name ?? symbol
  );
}

function createDemoPoints(symbol: string): PricePoint[] {
  const base = demoBases[symbol];
  if (!base) {
    throw new Error("This symbol is not in the demo asset list.");
  }

  const today = new Date();
  const points: PricePoint[] = [];
  let close = base * 0.82;

  for (let day = 99; day >= 0; day -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - day);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const index = points.length;
    const drift = (base - close) / Math.max(100 - index, 1) * 0.62;
    const cycle = Math.sin(index * 0.42 + symbol.length) * base * 0.006;
    const noise = Math.cos(index * 1.73 + symbol.charCodeAt(0)) * base * 0.004;
    close = Math.max(1, close + drift + cycle + noise);
    points.push({
      date: date.toISOString().slice(0, 10),
      close: round(close),
      volume: Math.round(18_000_000 + Math.abs(Math.sin(index)) * 32_000_000),
    });
  }

  points[points.length - 1].close = base;
  return points;
}

function toSnapshot(
  symbol: string,
  points: PricePoint[],
  provider: string,
  mode: "live" | "demo",
): MarketSnapshot {
  if (points.length < 2) {
    throw new Error("The market-data provider returned too little history.");
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const closes = points.map((point) => point.close);
  const asOf = latest.date;
  const ageInDays =
    (Date.now() - new Date(`${asOf}T23:59:59Z`).getTime()) /
    (1000 * 60 * 60 * 24);

  return {
    asset: { symbol, name: getAssetName(symbol) },
    source: {
      mode,
      provider,
      asOf,
      stale: ageInDays > 5,
    },
    price: latest.close,
    change: round(latest.close - previous.close),
    changePercent: round(
      ((latest.close - previous.close) / previous.close) * 100,
    ),
    points,
    stats: {
      high: Math.max(...closes),
      low: Math.min(...closes),
      averageVolume: Math.round(
        points.reduce((total, point) => total + point.volume, 0) /
          points.length,
      ),
    },
    indicators: calculateIndicators(points),
  };
}

function parseAlphaVantageSeries(
  payload: Record<string, unknown>,
): PricePoint[] {
  const seriesKey = Object.keys(payload).find((key) =>
    key.startsWith("Time Series"),
  );
  const series = seriesKey ? payload[seriesKey] : undefined;
  if (!series || typeof series !== "object") return [];

  return Object.entries(series)
    .map(([date, rawValue]) => {
      if (!rawValue || typeof rawValue !== "object") return null;
      const values = rawValue as Record<string, unknown>;
      const close = Number(values["4. close"]);
      const volume = Number(values["5. volume"] ?? 0);
      if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(volume)) {
        return null;
      }
      return { date, close, volume };
    })
    .filter((point): point is PricePoint => point !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
}

async function alphaVantageRequest(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error("Market-data API key is not configured.");

  const url = new URL("https://www.alphavantage.co/query");
  for (const [key, value] of Object.entries({
    ...params,
    apikey: apiKey,
  })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) {
    throw new Error("The market-data provider is temporarily unavailable.");
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The market-data provider returned an invalid response.");
  }

  const result = payload as Record<string, unknown>;
  const providerMessage =
    result.Note ?? result.Information ?? result["Error Message"];
  if (typeof providerMessage === "string") {
    throw new Error(
      providerMessage.includes("API call frequency")
        ? "The market-data request limit was reached. Try again later."
        : "The market-data provider could not return this request.",
    );
  }
  return result;
}

export async function getMarketSnapshot(
  inputSymbol: string,
): Promise<MarketSnapshot> {
  const symbol = inputSymbol.trim().toUpperCase();
  if (!/^[A-Z0-9.-]{1,10}$/.test(symbol)) {
    throw new Error("Enter a valid ticker symbol.");
  }

  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    const points = createDemoPoints(symbol);
    return toSnapshot(symbol, points, "Synthetic demo data", "demo");
  }

  const payload = await alphaVantageRequest({
    function: "TIME_SERIES_DAILY",
    symbol,
    outputsize: "compact",
  });
  const points = parseAlphaVantageSeries(payload);
  if (points.length < 2) {
    throw new Error("No daily price history was available for this symbol.");
  }

  return toSnapshot(symbol, points, "Alpha Vantage · daily close", "live");
}

export async function searchAssets(query: string): Promise<AssetSearchResult[]> {
  const keyword = query.trim();
  if (keyword.length < 1 || keyword.length > 40) return [];

  if (!process.env.ALPHA_VANTAGE_API_KEY) {
    const normalized = keyword.toUpperCase();
    return demoAssets
      .filter(
        (asset) =>
          asset.symbol.includes(normalized) ||
          asset.name.toUpperCase().includes(normalized),
      )
      .slice(0, 8);
  }

  const payload = await alphaVantageRequest({
    function: "SYMBOL_SEARCH",
    keywords: keyword,
  });
  const matches = payload.bestMatches;
  if (!Array.isArray(matches)) return [];

  return matches.slice(0, 8).flatMap((match) => {
    if (!match || typeof match !== "object") return [];
    const values = match as Record<string, unknown>;
    const symbol = values["1. symbol"];
    const name = values["2. name"];
    if (typeof symbol !== "string" || typeof name !== "string") return [];
    return [
      {
        symbol,
        name,
        type: String(values["3. type"] ?? "Equity"),
        region: String(values["4. region"] ?? "Unknown"),
      },
    ];
  });
}
