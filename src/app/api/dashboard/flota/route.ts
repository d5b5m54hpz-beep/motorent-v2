import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR", "VIEWER"]);
  if (error) return error;

  try {
    // Estado de la flota
    const estadoFlota = await prisma.moto.groupBy({
      by: ["estado"],
      _count: { id: true },
    });

    const total = await prisma.moto.count({ where: { estado: { not: "baja" } } });
    const alquiladas = await prisma.moto.count({ where: { estado: "alquilada" } });

    // Valor de la flota
    const valorFlota = await prisma.moto.aggregate({
      where: { estado: { not: "baja" }, valorCompra: { not: null } },
      _sum: { valorCompra: true, valorResidual: true },
    });

    // Depreciación mensual promedio (simplificado)
    const deprecMensual = ((valorFlota._sum.valorCompra || 0) - (valorFlota._sum.valorResidual || 0)) / 60; // 5 años = 60 meses

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
      where: { estadoPatentamiento: { not: "COMPLETADO" } },
    });

    return NextResponse.json({
      estadoFlota: estadoFlota.map((e) => ({
        estado: e.estado,
        cantidad: e._count.id,
      })),
      total,
      tasaOcupacion: total > 0 ? Math.round((alquiladas / total) * 100) : 0,
      valorFlota: Math.round(valorFlota._sum.valorCompra || 0),
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
