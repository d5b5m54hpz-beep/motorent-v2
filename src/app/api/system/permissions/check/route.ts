import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { hasPermission, getUserPermissions, getUserPermissionsWithSource, type PermissionType } from "@/lib/auth/permissions";

// GET: Check if a user has a specific permission, or list all user permissions
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.system.config.view, "view", []);
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

    // Otherwise return all permissions for the user (with source profile names)
    const permissions = await getUserPermissionsWithSource(userId);
    const result: Record<string, { canView: boolean; canCreate: boolean; canExecute: boolean; canApprove: boolean; grantedBy: string[] }> = {};
    for (const [code, perm] of permissions) {
      result[code] = perm;
    }

    return NextResponse.json({ userId, permissions: result });
  } catch (err: unknown) {
    console.error("Error checking permissions:", err);
    return NextResponse.json({ error: "Error al verificar permisos" }, { status: 500 });
  }
}
