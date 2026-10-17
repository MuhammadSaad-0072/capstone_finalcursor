import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { getMarketSnapshot } from "@/lib/market/provider";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const requestSchema = z.object({
  symbol: z.string().trim().regex(/^[A-Za-z0-9.-]{1,10}$/),
  side: z.enum(["buy", "sell"]),
  quantity: z
    .number()
    .finite()
    .positive()
    .max(1_000_000)
    .refine((quantity) => Number(quantity.toFixed(6)) === quantity, {
      message: "Quantity can have at most 6 decimal places.",
    }),
});

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "demo", trades: [] });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return apiError("Database is not configured.", 503);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return apiError("Sign in to view your portfolio.", 401);

  const { data, error } = await supabase
    .from("paper_trades")
    .select("id, asset_symbol, side, quantity, price, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[trades] Could not load paper trades.");
    return apiError("Portfolio history could not be loaded.", 502);
  }

  return NextResponse.json({ mode: "supabase", trades: data });
}

export async function POST(request: NextRequest) {
  const parsed = await readJson(request, requestSchema);
  if ("error" in parsed) return apiError(parsed.error, 400);
  if (!isSupabaseConfigured()) {
    return apiError("Use browser demo storage or configure Supabase.", 503);
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return apiError("Database is not configured.", 503);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return apiError("Sign in to record a paper trade.", 401);
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return apiError(
      "Paper-trade storage is not configured. Add the server-only Supabase service key.",
      503,
    );
  }

  let market;
  try {
    market = await getMarketSnapshot(parsed.data.symbol);
  } catch {
    return apiError("A current market price is unavailable for this trade.", 502);
  }

  const { data, error } = await admin.rpc("record_paper_trade", {
    p_user_id: auth.user.id,
    p_asset_symbol: parsed.data.symbol.toUpperCase(),
    p_side: parsed.data.side,
    p_quantity: parsed.data.quantity,
    p_price: market.price,
  });
  if (error) {
    if (
      error.message.includes("Insufficient paper position") ||
      error.message.includes("Insufficient paper cash")
    ) {
      return apiError(error.message, 400);
    }
    console.error("[trades] Paper trade could not be recorded.");
    return apiError("Paper trade could not be recorded.", 502);
  }
  if (!data) {
    console.error("[trades] Paper trade RPC returned no row.");
    return apiError("Paper trade could not be recorded.", 502);
  }

  return NextResponse.json(
    {
      mode: "supabase",
      trade: {
        id: data.id,
        asset_symbol: data.asset_symbol,
        side: data.side,
        quantity: data.quantity,
        price: data.price,
        created_at: data.created_at,
      },
    },
    { status: 201 },
  );
}
