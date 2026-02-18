import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.hr.employee.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const now = new Date();
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activos, enLicencia, bajasDelMes, recibosDelMes, ausenciasDelMes] = await Promise.all([
      prisma.empleado.count({ where: { estado: "ACTIVO" } }),
      prisma.empleado.count({ where: { estado: "LICENCIA" } }),
      prisma.empleado.count({ where: { estado: "BAJA", fechaEgreso: { gte: primerDiaMes } } }),
      prisma.reciboSueldo.findMany({
        where: { mes: now.getMonth() + 1, anio: now.getFullYear(), estado: "CONFIRMADO" },
        select: { totalHaberes: true, totalAportesPatronales: true },
      }),
      prisma.ausencia.groupBy({
        by: ["tipo"],
        where: { fechaInicio: { gte: primerDiaMes } },
        _count: { id: true },
      }),
    ]);

    const costoLaboralMes = recibosDelMes.reduce(
      (sum, r) => sum + Number(r.totalHaberes) + Number(r.totalAportesPatronales),
      0
    );

    return NextResponse.json({
      activos,
      enLicencia,
      bajasDelMes,
      costoLaboralMes: Math.round(costoLaboralMes),
      ausenciasDelMes: ausenciasDelMes.map((a) => ({
        tipo: a.tipo,
        cantidad: a._count.id,
      })),
    });
  } catch (err: unknown) {
    console.error("Error fetching RRHH stats:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
