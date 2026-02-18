import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.finance.summary.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const margen = parseFloat(url.searchParams.get("margen") ?? "30") / 100;

    const motos = await prisma.moto.findMany({
      where: { estado: { not: "BAJA" } },
      select: {
        id: true,
        marca: true,
        modelo: true,
        patente: true,
        precioMensual: true,
        estado: true,
        createdAt: true,
      },
    });

    const now = new Date();
    const totalMotos = motos.length;
    const motosAlquiladas = motos.filter((m) => m.estado === "ALQUILADA").length;

    const result = await Promise.all(
      motos.map(async (moto) => {
        // Monthly operational cost (last 6 months average)
        const hace6m = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const gastosTotal = await prisma.gasto.aggregate({
          where: { motoId: moto.id, fecha: { gte: hace6m } },
          _sum: { monto: true },
        });

        const meses = Math.max(
          1,
          Math.min(6, (now.getTime() - moto.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
        );
        const costoOperativoMensual = (Number(gastosTotal._sum.monto) || 0) / meses;

        // Suggested prices based on cost + margin
        const precioSugeridoMensual = costoOperativoMensual * (1 + margen);
        const precioSugeridoDiario = precioSugeridoMensual / 30;
        const precioSugeridoSemanal = precioSugeridoMensual / 4;

        // Break-even: days rented needed to cover monthly costs
        const precioMensualNum = Number(moto.precioMensual);
        const precioDiarioActual = precioMensualNum / 30;
        const puntoEquilibrio = precioDiarioActual > 0
          ? Math.ceil(costoOperativoMensual / precioDiarioActual)
          : 30;

        const diferencia = precioMensualNum - precioSugeridoMensual;
        let status: "subpreciada" | "ok" | "sobrepreciada" = "ok";
        if (precioMensualNum < precioSugeridoMensual * 0.95) status = "subpreciada";
        else if (precioMensualNum > precioSugeridoMensual * 1.4) status = "sobrepreciada";

        return {
          id: moto.id,
          marca: moto.marca,
          modelo: moto.modelo,
          patente: moto.patente,
          costoOperativoMensual: Math.round(costoOperativoMensual),
          precioActual: precioMensualNum,
          precioSugeridoMensual: Math.round(precioSugeridoMensual),
          precioSugeridoDiario: Math.round(precioSugeridoDiario),
          precioSugeridoSemanal: Math.round(precioSugeridoSemanal),
          diferencia: Math.round(diferencia),
          puntoEquilibrio,
          status,
        };
      })
    );

    const precioPromedioFlota = motos.length > 0
      ? Math.round(motos.reduce((s, m) => s + Number(m.precioMensual), 0) / motos.length)
      : 0;

    const margenPromedioActual = result.length > 0
      ? Math.round(
          result.reduce((s, m) => {
            if (m.costoOperativoMensual === 0) return s;
            return s + ((m.precioActual - m.costoOperativoMensual) / m.costoOperativoMensual) * 100;
          }, 0) / result.filter((m) => m.costoOperativoMensual > 0).length || 0
        )
      : 0;

    return NextResponse.json({
      data: result,
      ocupacionFlota: totalMotos > 0 ? Math.round((motosAlquiladas / totalMotos) * 100) : 0,
      precioPromedioFlota,
      margenPromedioActual,
      motosSubpreciadas: result.filter((m) => m.status === "subpreciada").length,
    });
  } catch (err: unknown) {
    console.error("Error fetching pricing:", err);
    return NextResponse.json({ data: [], ocupacionFlota: 0, precioPromedioFlota: 0, margenPromedioActual: 0, motosSubpreciadas: 0 });
  }
}
