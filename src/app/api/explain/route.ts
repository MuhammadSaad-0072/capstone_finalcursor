import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { getMarketSnapshot } from "@/lib/market/provider";
import { createSupabaseRouteClient, isSupabaseConfigured } from "@/lib/supabase/server";

const requestSchema = z.object({
  symbol: z.string().trim().regex(/^[A-Za-z0-9.-]{1,10}$/),
});

function ruleBasedSummary(snapshot: Awaited<ReturnType<typeof getMarketSnapshot>>) {
  const { indicators } = snapshot;
  const trend =
    indicators.sma20 === null
      ? "There is not enough history to compare the latest close with the 20-day average."
      : snapshot.price >= indicators.sma20
        ? `The latest close is above its 20-day simple moving average (${indicators.sma20.toFixed(2)}).`
        : `The latest close is below its 20-day simple moving average (${indicators.sma20.toFixed(2)}).`;
  const momentum =
    indicators.rsi14 === null
      ? "RSI is unavailable until enough daily observations are available."
      : `The 14-day RSI is ${indicators.rsi14.toFixed(1)}. Values near 70 or 30 are commonly watched as momentum context, not as standalone signals.`;

  return {
    mode: "rules" as const,
    provider: "Rule-based educational fallback",
    summary: `${trend} ${momentum} The latest daily move was ${snapshot.changePercent >= 0 ? "up" : "down"} ${Math.abs(snapshot.changePercent).toFixed(2)}%. These observations describe past data and do not predict future prices.`,
    inputs: [
      `Latest daily close: ${snapshot.price.toFixed(2)} USD (${snapshot.source.asOf})`,
      `20-day SMA: ${indicators.sma20?.toFixed(2) ?? "not available"}`,
      `50-day SMA: ${indicators.sma50?.toFixed(2) ?? "not available"}`,
      `14-day RSI: ${indicators.rsi14?.toFixed(1) ?? "not available"}`,
      `One-day change: ${snapshot.changePercent.toFixed(2)}%`,
    ],
    notice:
      "This is educational information, not financial advice or a recommendation.",
  };
}

export async function POST(request: NextRequest) {
  const parsed = await readJson(request, requestSchema);
  if ("error" in parsed) return apiError(parsed.error, 400);

  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseConfigured = isSupabaseConfigured();
  if (apiKey && supabaseConfigured) {
    const supabase = await createSupabaseRouteClient();
    if (!supabase) return apiError("Authentication is not configured.", 503);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      return apiError("Sign in to request an AI explanation.", 401);
    }
  }

  let snapshot;
  try {
    snapshot = await getMarketSnapshot(parsed.data.symbol);
  } catch {
    return apiError(
      "Market inputs could not be loaded, so an explanation was not generated.",
      502,
    );
  }

  if (!apiKey) {
    return NextResponse.json(ruleBasedSummary(snapshot));
  }
  if (!supabaseConfigured) {
    return NextResponse.json({
      ...ruleBasedSummary(snapshot),
      notice:
        "Gemini is not enabled until Supabase authentication is configured. This is a local rules-based explanation, not financial advice.",
    });
  }

  const client = new GoogleGenAI({ apiKey });
  const prompt = [
    "Write a concise educational explanation of historical market observations.",
    "Do not recommend buying or selling, predict future prices, or claim certainty.",
    "Use only the supplied facts. Explicitly mention that indicators are not guarantees.",
    "Do not infer causes or news that are not included in the data.",
    JSON.stringify({
      symbol: snapshot.asset.symbol,
      asOf: snapshot.source.asOf,
      latestDailyClose: snapshot.price,
      oneDayChangePercent: snapshot.changePercent,
      sma20: snapshot.indicators.sma20,
      sma50: snapshot.indicators.sma50,
      rsi14: snapshot.indicators.rsi14,
    }),
  ].join("\n\n");

  try {
    const response = await client.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      input: prompt,
    });
    const summary = response.output_text?.trim();
    if (!summary) {
      return NextResponse.json(ruleBasedSummary(snapshot));
    }
    return NextResponse.json({
      mode: "ai",
      provider: "Google Gemini",
      summary,
      inputs: [
        `Latest daily close: ${snapshot.price.toFixed(2)} USD (${snapshot.source.asOf})`,
        `20-day SMA: ${snapshot.indicators.sma20?.toFixed(2) ?? "not available"}`,
        `50-day SMA: ${snapshot.indicators.sma50?.toFixed(2) ?? "not available"}`,
        `14-day RSI: ${snapshot.indicators.rsi14?.toFixed(1) ?? "not available"}`,
        `One-day change: ${snapshot.changePercent.toFixed(2)}%`,
      ],
      notice:
        "AI-generated educational commentary may be incomplete or inaccurate. It is not financial advice.",
    });
  } catch {
    console.error("[explain] Gemini request failed; using rule-based fallback.");
    return NextResponse.json({
      ...ruleBasedSummary(snapshot),
      notice:
        "The AI service was unavailable, so this explanation was generated by local rules. It is not financial advice.",
    });
  }
}
