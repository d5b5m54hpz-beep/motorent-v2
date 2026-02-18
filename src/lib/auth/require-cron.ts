import { NextRequest, NextResponse } from "next/server";

/**
 * Shared cron job authentication helper.
 * Validates Bearer token against CRON_SECRET env var.
 * In dev (no CRON_SECRET set), allows all requests.
 */
export function requireCron(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET) return null; // Allow in dev
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
