import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { hasPermission, getUserPermissions, type PermissionType } from "@/lib/auth/permissions";

// GET: Check if a user has a specific permission, or list all user permissions
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const operation = searchParams.get("operation");
    const permType = searchParams.get("type") as PermissionType | null;

    if (!userId) {
      return NextResponse.json({ error: "userId requerido" }, { status: 400 });
    }

    // If operation and type provided, check specific permission
    if (operation && permType) {
      const allowed = await hasPermission(userId, operation, permType);
      return NextResponse.json({ userId, operation, type: permType, allowed });
    }

    // Otherwise return all permissions for the user
    const permissions = await getUserPermissions(userId);
    const result: Record<string, { canView: boolean; canCreate: boolean; canExecute: boolean; canApprove: boolean }> = {};
    for (const [code, perm] of permissions) {
      result[code] = perm;
    }

    return NextResponse.json({ userId, permissions: result });
  } catch (err: unknown) {
    console.error("Error checking permissions:", err);
    return NextResponse.json({ error: "Error al verificar permisos" }, { status: 500 });
  }
}
