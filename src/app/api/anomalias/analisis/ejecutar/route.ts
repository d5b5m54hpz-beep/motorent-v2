import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { runDailyAnalysis, runWeeklyAnalysis, runMonthlyAnalysis } from "@/lib/services/financial-analysis";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.anomaly.analysis.run, "execute", ["CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const tipo = body?.tipo;

    if (!tipo || !["DIARIO", "SEMANAL", "MENSUAL"].includes(tipo)) {
      return NextResponse.json(
        { error: "El campo 'tipo' debe ser DIARIO, SEMANAL o MENSUAL" },
        { status: 400 }
      );
    }

    let result;
    switch (tipo) {
      case "DIARIO":
        result = await runDailyAnalysis();
        break;
      case "SEMANAL":
        result = await runWeeklyAnalysis();
        break;
      case "MENSUAL":
        result = await runMonthlyAnalysis();
        break;
    }

    eventBus.emit(
      OPERATIONS.anomaly.analysis.run,
      "AnalisisFinanciero",
      tipo,
      { tipo, anomaliasDetectadas: result!.anomaliasDetectadas, metricas: result!.metricas },
      userId
    ).catch(err => console.error("Error emitting anomaly.analysis.run event:", err));

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Error running financial analysis:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
