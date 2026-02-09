import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

type AuthResult = {
  error: NextResponse | null;
  role?: Role;
  userId?: string;
};

export async function requireRole(roles: Role[]): Promise<AuthResult & { user?: any }> {
  const session = await auth();

  console.log("[requireRole] Session:", {
    hasSession: !!session,
    hasUser: !!session?.user,
    userRole: session?.user?.role,
    userId: session?.user?.id,
    requiredRoles: roles,
  });

  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "No autenticado. Por favor iniciá sesión de nuevo." },
        { status: 401 }
      ),
    };
  }

  const role = session.user.role;
  const userId = session.user.id;

  // Check if user has role (handles old sessions without role)
  if (!role) {
    console.log("[requireRole] User has no role - session may be invalid");
    return {
      error: NextResponse.json(
        {
          error: "Sesión inválida. Por favor cerrá sesión e iniciá sesión de nuevo.",
        },
        { status: 401 }
      ),
    };
  }

  if (!roles.includes(role)) {
    console.log("[requireRole] Permission denied:", {
      userRole: role,
      requiredRoles: roles,
      includes: false,
    });
    return {
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { error: null, role, userId, user: session.user };
}
