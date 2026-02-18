import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.finance.profitability.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const motos = await prisma.moto.findMany({
      where: { estado: { not: "BAJA" } },
      select: {
        id: true,
        marca: true,
        modelo: true,
        patente: true,
        kilometraje: true,
        precioMensual: true,
        estado: true,
        createdAt: true,
      },
    });

    const result = await Promise.all(
      motos.map(async (moto) => {
        // Total income from contracts
        const pagosAprobados = await prisma.pago.aggregate({
          where: {
            estado: "APROBADO",
            contrato: { motoId: moto.id },
          },
          _sum: { monto: true },
        });
        const ingresos = Number(pagosAprobados._sum.monto) || 0;

        // Total expenses (gastos + mantenimientos without associated gasto)
        const gastosDirectos = await prisma.gasto.aggregate({
          where: { motoId: moto.id },
          _sum: { monto: true },
        });
        const gastos = Number(gastosDirectos._sum.monto) || 0;

        // Days rented
        const contratos = await prisma.contrato.findMany({
          where: { motoId: moto.id, estado: { in: ["ACTIVO", "FINALIZADO"] } },
          select: { fechaInicio: true, fechaFin: true },
        });

        let diasAlquilada = 0;
        const now = new Date();
        for (const c of contratos) {
          const fin = c.fechaFin < now ? c.fechaFin : now;
          const diff = (fin.getTime() - c.fechaInicio.getTime()) / (1000 * 60 * 60 * 24);
          diasAlquilada += Math.max(0, Math.round(diff));
        }

        // Total days since moto was added
        const diasTotal = Math.max(
          1,
          Math.round((now.getTime() - moto.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        );

        const rentabilidad = ingresos - gastos;
        const mesesActiva = Math.max(1, diasTotal / 30);
        const rentabilidadMensual = rentabilidad / mesesActiva;
        const costoPorKm = moto.kilometraje > 0 ? gastos / moto.kilometraje : 0;
        const roi = gastos > 0 ? (rentabilidad / gastos) * 100 : 0;

        return {
          id: moto.id,
          marca: moto.marca,
          modelo: moto.modelo,
          patente: moto.patente,
          estado: moto.estado,
          precioMensual: Number(moto.precioMensual),
          ingresos,
          gastos,
          rentabilidad,
          rentabilidadMensual: Math.round(rentabilidadMensual),
          costoPorKm: Math.round(costoPorKm * 100) / 100,
          diasAlquilada,
          diasParada: diasTotal - diasAlquilada,
          roi: Math.round(roi),
        };
      })
    );

    result.sort((a, b) => b.rentabilidad - a.rentabilidad);

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    console.error("Error fetching rentabilidad:", err);
    return NextResponse.json({ data: [] });
  }
}
