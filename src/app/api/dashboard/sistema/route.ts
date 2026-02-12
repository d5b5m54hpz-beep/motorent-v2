import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "VIEWER"]);
  if (error) return error;

  try {
    const [ultimoDiagnostico, usuariosActivos] = await Promise.all([
      prisma.diagnosticoRun.findFirst({
        orderBy: { createdAt: "desc" },
        select: { nota: true, createdAt: true },
      }),
      prisma.user.count({ where: { role: { not: "CLIENTE" } } }),
    ]);

    return NextResponse.json({
      notaDiagnostico: ultimoDiagnostico?.nota || "N/A",
      usuariosActivos,
      ultimoDiagnostico: ultimoDiagnostico?.createdAt || null,
      toolsIA: 25, // Placeholder
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard sistema:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
