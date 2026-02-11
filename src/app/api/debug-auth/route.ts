import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// TEMPORARY diagnostic endpoint - DELETE after fixing auth
export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Check env vars (only show if set, not the values)
  checks.AUTH_SECRET_set = !!process.env.AUTH_SECRET;
  checks.NEXTAUTH_SECRET_set = !!process.env.NEXTAUTH_SECRET;
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "NOT SET";
  checks.NODE_ENV = process.env.NODE_ENV;

  // 2. Check if admin user exists
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

      // 3. Test password hash
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

  // 4. Check total users
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
