import { NextResponse } from "next/server";
import type { z } from "zod";

export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { error: "Request body must be valid JSON." };
    }
    throw error;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request body." };
  }
  return { data: parsed.data };
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
