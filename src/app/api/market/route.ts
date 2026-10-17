import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getMarketSnapshot } from "@/lib/market/provider";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  if (!/^[A-Za-z0-9.-]{1,10}$/.test(symbol)) {
    return apiError("Enter a valid ticker symbol.", 400);
  }

  try {
    const snapshot = await getMarketSnapshot(symbol);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("demo asset list")) {
      return apiError("This asset is not available in demo mode.", 404);
    }
    if (error instanceof Error && error.message.includes("No daily price history")) {
      return apiError(error.message, 404);
    }
    const message =
      error instanceof Error
        ? error.message
        : "Market data could not be loaded.";
    return apiError(message, 502);
  }
}
