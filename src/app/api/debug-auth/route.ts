import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// TEMPORARY diagnostic endpoint - DELETE after fixing auth
export async function GET(req: NextRequest) {
  const checks: Record<string, unknown> = {};

  // 1. Check env vars (only show if set, not the values)
  checks.AUTH_SECRET_set = !!process.env.AUTH_SECRET;
  checks.NEXTAUTH_SECRET_set = !!process.env.NEXTAUTH_SECRET;
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "NOT SET";
  checks.NODE_ENV = process.env.NODE_ENV;

  // 2. Check cookies present in the request
  const cookieNames = req.cookies.getAll().map((c) => c.name);
  checks.cookies = cookieNames;
  checks.hasSessionCookie =
    cookieNames.some((n) => n.includes("session-token")) ||
    cookieNames.some((n) => n.includes("authjs"));

  // 3. Check auth() session (same function used by middleware and layout)
  try {
    const session = await auth();
    checks.authSession = session
      ? { user: session.user?.email, role: session.user?.role, id: session.user?.id }
      : null;
  } catch (error: unknown) {
    checks.authSessionError = error instanceof Error ? error.message : String(error);
  }

  // 4. Check if admin user exists
  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin@motorent.com" },
      select: { id: true, email: true, role: true, password: true, provider: true },
    });

    if (admin) {
      checks.adminUser = {
        exists: true,
        email: admin.email,
        role: admin.role,
        hasPassword: !!admin.password,
        provider: admin.provider,
        passwordLength: admin.password?.length ?? 0,
      };

      // 5. Test password hash
      if (admin.password) {
        const isValid = await bcrypt.compare("admin123", admin.password);
        checks.passwordTest = {
          testPassword: "admin123",
          isValid,
          hashPrefix: admin.password.substring(0, 10) + "...",
        };
      }
    } else {
      checks.adminUser = { exists: false };
    }
  } catch (error: unknown) {
    checks.dbError = error instanceof Error ? error.message : String(error);
  }

  // 6. Check total users
  try {
    const userCount = await prisma.user.count();
    checks.totalUsers = userCount;
  } catch {
    checks.totalUsers = "error";
  }

  return NextResponse.json(checks, {
    headers: { "Cache-Control": "no-store" },
  });
}
