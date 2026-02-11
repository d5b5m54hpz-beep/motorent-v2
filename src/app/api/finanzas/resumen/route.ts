import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  try {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Current month income (approved payments)
    const ingresosMes = await prisma.pago.aggregate({
      where: { estado: "aprobado", pagadoAt: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });

    // Current month expenses
    const gastosMes = await prisma.gasto.aggregate({
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });

    const ingresos = ingresosMes._sum.monto ?? 0;
    const gastos = gastosMes._sum.monto ?? 0;

    // Fleet occupancy
    const totalMotos = await prisma.moto.count({ where: { estado: { not: "baja" } } });
    const motosAlquiladas = await prisma.moto.count({ where: { estado: "alquilada" } });
    const ocupacion = totalMotos > 0 ? (motosAlquiladas / totalMotos) * 100 : 0;

    // Last 12 months income vs expenses
    const ultimos12 = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [ing, gst] = await Promise.all([
        prisma.pago.aggregate({
          where: { estado: "aprobado", pagadoAt: { gte: d, lte: fin } },
          _sum: { monto: true },
        }),
        prisma.gasto.aggregate({
          where: { fecha: { gte: d, lte: fin } },
          _sum: { monto: true },
        }),
      ]);

      ultimos12.push({
        mes: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
        ingresos: ing._sum.monto ?? 0,
        gastos: gst._sum.monto ?? 0,
      });
    }

    // Top 5 expense categories this month
    const topCategorias = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
      orderBy: { _sum: { monto: "desc" } },
      take: 5,
    });

    // Budget vs actual
    const presupuestos = await prisma.presupuestoMensual.findMany({
      where: { mes: now.getMonth() + 1, anio: now.getFullYear() },
    });

    const gastosCategoria = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });
    const gastoMap = new Map(gastosCategoria.map((g) => [g.categoria, g._sum.monto ?? 0]));

    const presupuestoVsReal = presupuestos.map((p) => ({
      categoria: p.categoria,
      presupuestado: p.montoPresupuestado,
      real: gastoMap.get(p.categoria) ?? 0,
      porcentaje: p.montoPresupuestado > 0
        ? ((gastoMap.get(p.categoria) ?? 0) / p.montoPresupuestado) * 100
        : 0,
    }));

    // Cash flow last 30 days
    const hace30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [pagos30, gastos30] = await Promise.all([
      prisma.pago.findMany({
        where: { estado: "aprobado", pagadoAt: { gte: hace30 } },
        select: { monto: true, pagadoAt: true },
        orderBy: { pagadoAt: "asc" },
      }),
      prisma.gasto.findMany({
        where: { fecha: { gte: hace30 } },
        select: { monto: true, fecha: true },
        orderBy: { fecha: "asc" },
      }),
    ]);

    const flujoDiario: Record<string, { ingresos: number; gastos: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      flujoDiario[key] = { ingresos: 0, gastos: 0 };
    }
    for (const p of pagos30) {
      if (p.pagadoAt) {
        const key = p.pagadoAt.toISOString().slice(0, 10);
        if (flujoDiario[key]) flujoDiario[key].ingresos += p.monto;
      }
    }
    for (const g of gastos30) {
      const key = g.fecha.toISOString().slice(0, 10);
      if (flujoDiario[key]) flujoDiario[key].gastos += g.monto;
    }

    const flujoCaja = Object.entries(flujoDiario).map(([fecha, vals]) => ({
      fecha: new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
      ...vals,
    }));

    return NextResponse.json({
      ingresosMes: ingresos,
      gastosMes: gastos,
      resultadoNeto: ingresos - gastos,
      ocupacionFlota: Math.round(ocupacion),
      totalMotos,
      motosAlquiladas,
      ultimos12,
      topCategorias: topCategorias.map((c) => ({
        categoria: c.categoria,
        monto: c._sum.monto ?? 0,
      })),
      presupuestoVsReal,
      flujoCaja,
    });
  } catch (err: unknown) {
    console.error("Error fetching financial summary:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
