import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasPermission, type PermissionType } from "./permissions";
import type { Role } from "@prisma/client";

type PermissionResult = {
  error: NextResponse | null;
  userId?: string;
};

/**
 * Require a granular permission for an API route.
 *
 * Replaces `requireRole()` with operation-level checks.
 *
 * Backwards-compatible:
 *   - Users with legacy role ADMIN are always allowed.
 *   - Pass `fallbackRoles` to allow users with those roles even if they
 *     don't have a granular permission profile yet. This ensures existing
 *     OPERADOR/CLIENTE users keep working during the migration period.
 *
 * @example
 *   // Strict: only granular permissions (+ ADMIN)
 *   const { error, userId } = await requirePermission("fleet.moto.create", "create");
 *
 *   // With fallback: OPERADOR keeps working even without a profile
 *   const { error, userId } = await requirePermission("fleet.moto.create", "create", ["OPERADOR"]);
 */
export async function requirePermission(
  operationCode: string,
  permissionType: PermissionType,
  fallbackRoles?: Role[]
): Promise<PermissionResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "No autenticado. Por favor iniciá sesión de nuevo." },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;
  const role = session.user.role;

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Sesión inválida. Por favor cerrá sesión e iniciá de nuevo." },
        { status: 401 }
      ),
    };
  }

  // Backwards compatibility: ADMIN role has full access
  if (role === "ADMIN") {
    return { error: null, userId };
  }

  // Check granular permission
  const allowed = await hasPermission(userId, operationCode, permissionType);

  if (allowed) {
    return { error: null, userId };
  }

  // Fallback: allow legacy roles during migration period
  if (fallbackRoles && role && fallbackRoles.includes(role)) {
    return { error: null, userId };
  }

  return {
    error: NextResponse.json(
      { error: `Sin permisos para ${permissionType} en ${operationCode}` },
      { status: 403 }
    ),
  };
}
