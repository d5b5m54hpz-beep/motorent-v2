import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET() {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    enProceso,
    pendientes,
    completadosMes,
    gastoMes,
    stockBajo,
  ] = await Promise.all([
    // Motos currently in maintenance
    prisma.mantenimiento.count({
      where: { estado: { in: ["EN_PROCESO", "ESPERANDO_REPUESTO"] } },
    }),
    // Pending/scheduled maintenances
    prisma.mantenimiento.count({
      where: { estado: { in: ["PENDIENTE", "PROGRAMADO"] } },
    }),
    // Completed this month
    prisma.mantenimiento.count({
      where: {
        estado: "COMPLETADO",
        fechaFin: { gte: firstOfMonth, lte: lastOfMonth },
      },
    }),
    // Total cost this month
    prisma.mantenimiento.aggregate({
      _sum: { costoTotal: true },
      where: {
        estado: "COMPLETADO",
        fechaFin: { gte: firstOfMonth, lte: lastOfMonth },
      },
    }),
    // Spare parts with low stock
    prisma.repuesto.count({
      where: {
        stock: { lte: prisma.repuesto.fields.stockMinimo },
      },
    }).catch(() => {
      // Fallback: raw comparison not supported, do manual check
      return 0;
    }),
  ]);

  // Low stock count (manual comparison since Prisma doesn't support field-to-field)
  const repuestos = await prisma.repuesto.findMany({
    select: { stock: true, stockMinimo: true },
  });
  const stockBajoCount = repuestos.filter((r) => r.stock <= r.stockMinimo).length;

  return NextResponse.json({
    enProceso,
    pendientes,
    completadosMes,
    gastoMes: gastoMes._sum.costoTotal ?? 0,
    stockBajo: stockBajoCount || stockBajo,
  });
}
