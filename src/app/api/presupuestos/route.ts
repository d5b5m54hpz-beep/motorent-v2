import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { presupuestoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.budget.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const mes = parseInt(url.searchParams.get("mes") ?? String(new Date().getMonth() + 1));
    const anio = parseInt(url.searchParams.get("anio") ?? String(new Date().getFullYear()));

    const presupuestos = await prisma.presupuestoMensual.findMany({
      where: { mes, anio },
      orderBy: { categoria: "asc" },
    });

    // Get actual expenses for the same month
    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0, 23, 59, 59);

    const gastosReales = await prisma.gasto.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });

    const gastoMap = new Map(
      gastosReales.map((g) => [g.categoria, Number(g._sum.monto) || 0])
    );

    const data = presupuestos.map((p) => ({
      ...p,
      gastoReal: gastoMap.get(p.categoria) ?? 0,
      porcentaje: Number(p.montoPresupuestado) > 0
        ? ((gastoMap.get(p.categoria) ?? 0) / Number(p.montoPresupuestado)) * 100
        : 0,
    }));

    return NextResponse.json({ data, mes, anio });
  } catch (err: unknown) {
    console.error("Error fetching presupuestos:", err);
    return NextResponse.json({ data: [], mes: 1, anio: 2026 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.budget.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = presupuestoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mes, anio, categoria, montoPresupuestado } = parsed.data;

    const presupuesto = await prisma.presupuestoMensual.upsert({
      where: { mes_anio_categoria: { mes, anio, categoria } },
      update: { montoPresupuestado },
      create: { mes, anio, categoria, montoPresupuestado },
    });

    eventBus.emit(OPERATIONS.budget.create, "PresupuestoMensual", presupuesto.id, { mes, anio, categoria, montoPresupuestado }, userId).catch(err => console.error("[Events] budget.create error:", err));

    return NextResponse.json(presupuesto, { status: 201 });
  } catch (err: unknown) {
    console.error("Error saving presupuesto:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
