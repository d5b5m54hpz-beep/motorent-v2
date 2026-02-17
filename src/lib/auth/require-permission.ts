import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasPermission, type PermissionType } from "./permissions";

type PermissionResult = {
  error: NextResponse | null;
  userId?: string;
};

/**
 * Require a granular permission for an API route.
 *
 * Replaces `requireRole()` with operation-level checks.
 *
 * Backwards-compatible: users with legacy role ADMIN are allowed everything.
 *
 * @example
 *   const { error, userId } = await requirePermission("fleet.moto.create", "create");
 *   if (error) return error;
 */
export async function requirePermission(
  operationCode: string,
  permissionType: PermissionType
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

  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: `Sin permisos para ${permissionType} en ${operationCode}` },
        { status: 403 }
      ),
    };
  }

  return { error: null, userId };
}
