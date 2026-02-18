import { prisma } from "@/lib/prisma";

export type PermissionType = "view" | "create" | "execute" | "approve";

export type PermissionCheck = {
  canView: boolean;
  canCreate: boolean;
  canExecute: boolean;
  canApprove: boolean;
};

/**
 * Match a wildcard pattern against an operation code.
 *
 *   "fleet.*"           matches "fleet.moto.create"
 *   "accounting.entry.*" matches "accounting.entry.create"
 *   "*"                 matches everything
 */
function matchPattern(pattern: string, code: string): boolean {
  if (pattern === "*") return true;
  if (pattern === code) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return code.startsWith(prefix + ".");
  }
  return false;
}

/**
 * Check if a user has a specific permission for an operation.
 *
 * Walks: User → UserProfile → PermissionProfile → PermissionGrant → Operation
 *
 * Supports wildcard operation codes in grants (e.g. a grant for "fleet.*"
 * matches "fleet.moto.create").
 */
export async function hasPermission(
  userId: string,
  operationCode: string,
  permissionType: PermissionType
): Promise<boolean> {
  // Get all user's permission grants via their profiles
  const userProfiles = await prisma.userProfile.findMany({
    where: { userId },
    include: {
      profile: {
        include: {
          grants: {
            include: { operation: true },
          },
        },
      },
    },
  });

  const permField = permissionTypeToField(permissionType);

  for (const up of userProfiles) {
    for (const grant of up.profile.grants) {
      if (matchPattern(grant.operation.code, operationCode) && grant[permField]) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all permissions for a user, grouped by operation code.
 */
export async function getUserPermissions(
  userId: string
): Promise<Map<string, PermissionCheck>> {
  const userProfiles = await prisma.userProfile.findMany({
    where: { userId },
    include: {
      profile: {
        include: {
          grants: {
            include: { operation: true },
          },
        },
      },
    },
  });

  const permissions = new Map<string, PermissionCheck>();

  for (const up of userProfiles) {
    for (const grant of up.profile.grants) {
      const code = grant.operation.code;
      const existing = permissions.get(code) ?? {
        canView: false,
        canCreate: false,
        canExecute: false,
        canApprove: false,
      };

      // Merge (OR) — if ANY profile grants a permission, the user has it
      permissions.set(code, {
        canView: existing.canView || grant.canView,
        canCreate: existing.canCreate || grant.canCreate,
        canExecute: existing.canExecute || grant.canExecute,
        canApprove: existing.canApprove || grant.canApprove,
      });
    }
  }

  return permissions;
}

/**
 * Get all permissions for a user with source profile names.
 */
export async function getUserPermissionsWithSource(
  userId: string
): Promise<Map<string, PermissionCheck & { grantedBy: string[] }>> {
  const userProfiles = await prisma.userProfile.findMany({
    where: { userId },
    include: {
      profile: {
        include: {
          grants: {
            include: { operation: true },
          },
        },
      },
    },
  });

  const permissions = new Map<string, PermissionCheck & { grantedBy: string[] }>();

  for (const up of userProfiles) {
    for (const grant of up.profile.grants) {
      const code = grant.operation.code;
      const existing = permissions.get(code) ?? {
        canView: false,
        canCreate: false,
        canExecute: false,
        canApprove: false,
        grantedBy: [],
      };

      const merged = {
        canView: existing.canView || grant.canView,
        canCreate: existing.canCreate || grant.canCreate,
        canExecute: existing.canExecute || grant.canExecute,
        canApprove: existing.canApprove || grant.canApprove,
        grantedBy: [...existing.grantedBy],
      };

      if (!merged.grantedBy.includes(up.profile.name)) {
        merged.grantedBy.push(up.profile.name);
      }

      permissions.set(code, merged);
    }
  }

  return permissions;
}

/**
 * Check permission and throw a structured error if denied.
 * Returns the userId on success.
 */
export async function checkAndThrow(
  userId: string,
  operationCode: string,
  permissionType: PermissionType
): Promise<void> {
  const allowed = await hasPermission(userId, operationCode, permissionType);
  if (!allowed) {
    const error = new Error(
      `Permiso denegado: ${permissionType} en ${operationCode}`
    );
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function permissionTypeToField(
  type: PermissionType
): keyof PermissionCheck {
  switch (type) {
    case "view":
      return "canView";
    case "create":
      return "canCreate";
    case "execute":
      return "canExecute";
    case "approve":
      return "canApprove";
  }
}
