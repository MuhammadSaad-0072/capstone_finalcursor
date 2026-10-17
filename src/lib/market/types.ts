export type PricePoint = {
  date: string;
  close: number;
  volume: number;
};

export type MarketSnapshot = {
  asset: {
    symbol: string;
    name: string;
  };
  source: {
    mode: "live" | "demo";
    provider: string;
    asOf: string;
    stale: boolean;
  };
  price: number;
  change: number;
  changePercent: number;
  points: PricePoint[];
  stats: {
    high: number;
    low: number;
    averageVolume: number;
  };
  indicators: {
    sma20: number | null;
    sma50: number | null;
    rsi14: number | null;
  };
};

export type AssetSearchResult = {
  symbol: string;
  name: string;
  type: string;
  region: string;
};
