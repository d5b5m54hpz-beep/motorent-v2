import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCron } from "@/lib/auth/require-cron";

/**
 * Cron job: Detecta contratos activos con renovacionAuto === true
 * que vencen en los próximos 7 días y genera alertas para el equipo.
 * No crea contratos automáticamente — solo notifica.
 *
 * Schedule: 0 8 * * * (8:00 AM diario)
 */
export async function GET(req: NextRequest) {
  const cronError = requireCron(req);
  if (cronError) return cronError;

  try {
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);
    const ahora = new Date();

    const contratos = await prisma.contrato.findMany({
      where: {
        estado: "ACTIVO",
        renovacionAuto: true,
        fechaFin: { lte: en7Dias, gte: ahora },
      },
      include: {
        cliente: { select: { nombre: true } },
        moto: { select: { patente: true, marca: true, modelo: true } },
      },
    });

    let alertas = 0;
    const errores: string[] = [];

    for (const contrato of contratos) {
      try {
        // Verificar que no exista ya un contrato sucesor para esta moto
        const sucesor = await prisma.contrato.findFirst({
          where: {
            motoId: contrato.motoId,
            estado: { in: ["PENDIENTE", "ACTIVO"] },
            id: { not: contrato.id },
          },
        });

        if (sucesor) continue; // Ya tiene renovación en curso

        const motoLabel =
          contrato.moto.patente ??
          `${contrato.moto.marca} ${contrato.moto.modelo}`;
        const fechaStr = contrato.fechaFin
          ? contrato.fechaFin.toLocaleDateString("es-AR")
          : "fecha desconocida";

        await prisma.alerta.create({
          data: {
            tipo: "CONTRATO_POR_VENCER",
            mensaje: `Renovación automática pendiente: contrato de ${contrato.cliente.nombre ?? "cliente"} con moto ${motoLabel} vence el ${fechaStr}.`,
            contratoId: contrato.id,
            leida: false,
          },
        });

        alertas++;
      } catch (err) {
        const msg = `Contrato ${contrato.id}: ${err instanceof Error ? err.message : "error desconocido"}`;
        errores.push(msg);
        console.error(`[job/renovar-contratos] ${msg}`);
      }
    }

    return NextResponse.json({
      message: `${contratos.length} contratos con renovación auto. ${alertas} alertas creadas.`,
      contratos: contratos.length,
      alertas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error: unknown) {
    console.error("[job/renovar-contratos] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
