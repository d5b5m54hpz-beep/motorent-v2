import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.reconciliation.match.view,
    "view",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const { id } = await params;

    // Get extractos belonging to this conciliacion that are not yet conciliado
    const extractos = await prisma.extractoBancario.findMany({
      where: {
        conciliacionId: id,
        estado: { not: "CONCILIADO" },
      },
      orderBy: { fecha: "asc" },
    });

    const pendientes = await Promise.all(
      extractos.map(async (extracto) => {
        const montoNum = extracto.monto.toNumber();
        const montoAbs = Math.abs(montoNum);
        const montoLow = montoAbs * 0.9;
        const montoHigh = montoAbs * 1.1;

        const fechaMin = new Date(extracto.fecha);
        fechaMin.setDate(fechaMin.getDate() - 30);
        const fechaMax = new Date(extracto.fecha);
        fechaMax.setDate(fechaMax.getDate() + 30);

        let sugerencias: Array<{
          tipo: "pago" | "gasto";
          id: string;
          monto: number;
          fecha: Date | null;
          referencia: string | null;
          diferenciaMonto: number;
        }> = [];

        if (extracto.tipo === "CREDITO") {
          const pagos = await prisma.pago.findMany({
            where: {
              monto: { gte: montoLow, lte: montoHigh },
              pagadoAt: { gte: fechaMin, lte: fechaMax },
              estado: "aprobado",
            },
            orderBy: { pagadoAt: "desc" },
            take: 10,
          });

          sugerencias = pagos
            .map((pago) => ({
              tipo: "pago" as const,
              id: pago.id,
              monto: pago.monto,
              fecha: pago.pagadoAt,
              referencia: pago.referencia,
              diferenciaMonto: Math.abs(pago.monto - montoAbs),
            }))
            .sort((a, b) => a.diferenciaMonto - b.diferenciaMonto)
            .slice(0, 3);
        } else if (extracto.tipo === "DEBITO") {
          const gastos = await prisma.gasto.findMany({
            where: {
              monto: { gte: montoLow, lte: montoHigh },
              fecha: { gte: fechaMin, lte: fechaMax },
            },
            orderBy: { fecha: "desc" },
            take: 10,
          });

          sugerencias = gastos
            .map((gasto) => ({
              tipo: "gasto" as const,
              id: gasto.id,
              monto: gasto.monto,
              fecha: gasto.fecha,
              referencia: null,
              diferenciaMonto: Math.abs(gasto.monto - montoAbs),
            }))
            .sort((a, b) => a.diferenciaMonto - b.diferenciaMonto)
            .slice(0, 3);
        }

        return {
          ...extracto,
          sugerencias,
        };
      })
    );

    return NextResponse.json({ pendientes });
  } catch (error: unknown) {
    console.error("[conciliacion/[id]/pendientes] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
