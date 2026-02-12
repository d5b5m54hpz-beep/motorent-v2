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
        select: { passed: true, warnings: true, errors: true, totalChecks: true, createdAt: true },
      }),
      prisma.user.count({ where: { role: { not: "CLIENTE" } } }),
    ]);

    // Generar nota del diagnóstico basado en resultados
    let notaDiagnostico = "N/A";
    if (ultimoDiagnostico) {
      if (ultimoDiagnostico.errors > 0) {
        notaDiagnostico = `${ultimoDiagnostico.errors} error(es) detectado(s)`;
      } else if (ultimoDiagnostico.warnings > 0) {
        notaDiagnostico = `${ultimoDiagnostico.warnings} advertencia(s)`;
      } else if (ultimoDiagnostico.passed === ultimoDiagnostico.totalChecks) {
        notaDiagnostico = "Sistema OK";
      }
    }

    return NextResponse.json({
      notaDiagnostico,
      usuariosActivos,
      ultimoDiagnostico: ultimoDiagnostico?.createdAt || null,
      toolsIA: 25, // Placeholder
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard sistema:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
