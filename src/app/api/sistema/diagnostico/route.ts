import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.dashboard.system.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const diagnosticos = await prisma.diagnosticoRun.findMany({
      orderBy: { fecha: "desc" },
      take: 10,
      include: {
        ejecutador: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: diagnosticos });
  } catch (err: unknown) {
    console.error("Error fetching diagnósticos:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
