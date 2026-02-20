import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.dashboard.fleet.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    // Estado de la flota
    const estadoFlota = await prisma.moto.groupBy({
      by: ["estado"],
      _count: { id: true },
    });

    const total = await prisma.moto.count({ where: { estado: { not: "BAJA_DEFINITIVA" } } });
    const alquiladas = await prisma.moto.count({ where: { estado: "ALQUILADA" } });

    // Valor de la flota
    const valorFlota = await prisma.moto.aggregate({
      where: { estado: { not: "BAJA_DEFINITIVA" }, valorCompra: { not: null } },
      _sum: { valorCompra: true, valorResidual: true },
    });

    // Depreciación mensual promedio (simplificado)
    const deprecMensual = (Number(valorFlota._sum.valorCompra || 0) - Number(valorFlota._sum.valorResidual || 0)) / 60; // 5 años = 60 meses

    // Mantenimientos próximos
    const mantenimientosProximos = await prisma.ordenTrabajo.findMany({
      where: {
        estado: { in: ["SOLICITADA", "APROBADA", "PROGRAMADA"] },
      },
      take: 5,
      include: {
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Motos en patentamiento
    const motasPatentamiento = await prisma.moto.count({
      where: { estadoPatentamiento: { not: "PATENTADA" } },
    });

    return NextResponse.json({
      estadoFlota: estadoFlota.map((e) => ({
        estado: e.estado,
        cantidad: e._count.id,
      })),
      total,
      tasaOcupacion: total > 0 ? Math.round((alquiladas / total) * 100) : 0,
      valorFlota: Math.round(Number(valorFlota._sum.valorCompra || 0)),
      depreciacionMensual: Math.round(deprecMensual),
      mantenimientosProximos: mantenimientosProximos.map((m) => ({
        moto: `${m.moto.marca} ${m.moto.modelo} (${m.moto.patente})`,
        tipo: m.tipoOT,
        estado: m.estado,
      })),
      motosPatentamiento: motasPatentamiento,
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard flota:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
