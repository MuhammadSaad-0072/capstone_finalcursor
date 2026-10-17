import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createSupabaseRouteClient();
  if (!code || !supabase) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(
    new URL(error ? "/?auth=failed" : "/", request.url),
  );
}
