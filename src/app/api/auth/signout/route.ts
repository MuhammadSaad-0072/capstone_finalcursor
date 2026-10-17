import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseRouteClient();
  if (!supabase) return NextResponse.json({ mode: "demo" });

  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ error: "Could not sign out." }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
