import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entidad: string; id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.system.diagnostic.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const { entidad, id } = await params;

    const logs = await prisma.auditLog.findMany({
      where: {
        entidad,
        entidadId: id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: logs });
  } catch (err: unknown) {
    console.error("Error fetching audit logs:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
