import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

type AuthResult = {
  error: NextResponse | null;
  role?: Role;
  userId?: string;
};

export async function requireRole(roles: Role[]): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  const role = session.user.role;
  const userId = session.user.id;

  if (!role || !roles.includes(role)) {
    return {
      error: NextResponse.json({ error: "Sin permisos" }, { status: 403 }),
    };
  }

  return { error: null, role, userId };
}
