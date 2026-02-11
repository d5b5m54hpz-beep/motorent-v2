import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { ejecutarDiagnosticoCompleto } from "@/lib/diagnostico";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { error, userId } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const resultado = await ejecutarDiagnosticoCompleto(baseUrl);

    // Guardar en base de datos
    await prisma.diagnosticoRun.create({
      data: {
        fecha: new Date(),
        duracion: resultado.duracion,
        totalChecks: resultado.totalChecks,
        passed: resultado.passed,
        warnings: resultado.warnings,
        errors: resultado.errors,
        resultados: resultado.checks as never,
        ejecutadoPor: userId!,
      },
    });

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (err: unknown) {
    console.error("Error ejecutando diagnóstico:", err);
    return NextResponse.json(
      {
        error: "Error ejecutando diagnóstico",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
