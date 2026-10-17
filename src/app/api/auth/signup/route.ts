import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readJson } from "@/lib/api";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const parsed = await readJson(request, requestSchema);
  if ("error" in parsed) return apiError(parsed.error, 400);

  const supabase = await createSupabaseRouteClient();
  if (!supabase) return apiError("Account sign-in is not configured.", 503);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: new URL("/auth/callback", request.url).toString(),
    },
  });
  if (error) {
    return apiError(
      "Could not create the account. Check the email address and Supabase Auth settings.",
      400,
    );
  }

  return NextResponse.json({
    emailConfirmationRequired: !data.session,
    user: data.user ? { email: data.user.email ?? null } : null,
  });
}
