import type { PricePoint } from "./types";

export function simpleMovingAverage(
  values: number[],
  period: number,
): number | null {
  if (values.length < period) return null;
  const window = values.slice(-period);
  return window.reduce((sum, value) => sum + value, 0) / period;
}

export function relativeStrengthIndex(
  values: number[],
  period = 14,
): number | null {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const difference = values[index] - values[index - 1];
    if (difference >= 0) gains += difference;
    else losses -= difference;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const difference = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(difference, 0)) / period;
    averageLoss =
      (averageLoss * (period - 1) + Math.max(-difference, 0)) / period;
  }

  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function calculateIndicators(points: PricePoint[]) {
  const closes = points.map((point) => point.close);
  return {
    sma20: simpleMovingAverage(closes, 20),
    sma50: simpleMovingAverage(closes, 50),
    rsi14: relativeStrengthIndex(closes),
  };
}
