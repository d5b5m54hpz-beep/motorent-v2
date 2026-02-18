import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.finance.cashflow.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const dias = parseInt(url.searchParams.get("dias") || "90");
    const proyectar = url.searchParams.get("proyectar") === "true";

    const now = new Date();
    const fechaInicio = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);

    // Obtener pagos (ingresos) del período
    const pagos = await prisma.pago.findMany({
      where: {
        estado: "APROBADO",
        pagadoAt: { gte: fechaInicio },
      },
      select: { monto: true, pagadoAt: true },
      orderBy: { pagadoAt: "asc" },
    });

    // Obtener gastos del período
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: { gte: fechaInicio },
      },
      select: { monto: true, fecha: true },
      orderBy: { fecha: "asc" },
    });

    // Crear flujo diario
    const flujoDiario: Record<
      string,
      { fecha: string; ingresos: number; gastos: number; saldo: number }
    > = {};

    // Inicializar todos los días del período
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      flujoDiario[key] = {
        fecha: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
        ingresos: 0,
        gastos: 0,
        saldo: 0,
      };
    }

    // Agregar ingresos
    for (const p of pagos) {
      if (p.pagadoAt) {
        const key = p.pagadoAt.toISOString().slice(0, 10);
        if (flujoDiario[key]) {
          flujoDiario[key].ingresos += Number(p.monto);
        }
      }
    }

    // Agregar gastos
    for (const g of gastos) {
      const key = g.fecha.toISOString().slice(0, 10);
      if (flujoDiario[key]) {
        flujoDiario[key].gastos += Number(g.monto);
      }
    }

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const flujo = Object.keys(flujoDiario)
      .sort()
      .map((key) => {
        const dia = flujoDiario[key];
        const flujoNeto = dia.ingresos - dia.gastos;
        saldoAcumulado += flujoNeto;
        return {
          ...dia,
          flujoNeto,
          saldoAcumulado,
        };
      });

    // Proyección (próximos 30 días)
    let proyeccion: Array<{
      fecha: string;
      ingresos: number;
      gastos: number;
      flujoNeto: number;
      saldoAcumulado: number;
      esProyeccion: boolean;
    }> = [];

    if (proyectar) {
      // Calcular promedios del período histórico
      const totalIngresos = flujo.reduce((sum, d) => sum + d.ingresos, 0);
      const totalGastos = flujo.reduce((sum, d) => sum + d.gastos, 0);
      const promIngresosDiario = totalIngresos / dias;
      const promGastosDiario = totalGastos / dias;

      let saldoProyectado = saldoAcumulado;

      for (let i = 1; i <= 30; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        const flujoProyectado = promIngresosDiario - promGastosDiario;
        saldoProyectado += flujoProyectado;

        proyeccion.push({
          fecha: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
          ingresos: promIngresosDiario,
          gastos: promGastosDiario,
          flujoNeto: flujoProyectado,
          saldoAcumulado: saldoProyectado,
          esProyeccion: true,
        });
      }
    }

    // Resumen
    const totalIngresos = flujo.reduce((sum, d) => sum + d.ingresos, 0);
    const totalGastos = flujo.reduce((sum, d) => sum + d.gastos, 0);
    const flujoNetoTotal = totalIngresos - totalGastos;
    const promedioIngresosDiario = totalIngresos / dias;
    const promedioGastosDiario = totalGastos / dias;

    return NextResponse.json({
      periodo: {
        desde: fechaInicio.toISOString().split("T")[0],
        hasta: now.toISOString().split("T")[0],
        dias,
      },
      resumen: {
        totalIngresos,
        totalGastos,
        flujoNetoTotal,
        promedioIngresosDiario,
        promedioGastosDiario,
        saldoFinal: saldoAcumulado,
      },
      flujo: flujo.map((f) => ({ ...f, esProyeccion: false })),
      proyeccion,
    });
  } catch (err: unknown) {
    console.error("Error calculando flujo de caja:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
