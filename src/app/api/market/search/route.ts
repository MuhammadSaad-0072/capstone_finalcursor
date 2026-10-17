import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { searchAssets } from "@/lib/market/provider";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") ?? "";
  if (query.trim().length > 40) {
    return apiError("Search terms must be 40 characters or fewer.", 400);
  }

  try {
    return NextResponse.json({ results: await searchAssets(query) });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Asset search is temporarily unavailable. Try again in a moment.";
    return apiError(message, 502);
  }
}
