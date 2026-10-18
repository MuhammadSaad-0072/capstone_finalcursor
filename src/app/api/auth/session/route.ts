import { NextResponse } from "next/server";
import { createSupabaseRouteClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "demo", user: null });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    return NextResponse.json({ error: "Could not verify the current session." }, { status: 401 });
  }
  return NextResponse.json({
    mode: "supabase",
    user: data.user ? { email: data.user.email ?? null } : null,
  });
}
