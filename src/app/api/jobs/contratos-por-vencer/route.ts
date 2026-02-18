import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCron } from "@/lib/auth/require-cron";

/**
 * Cron job: Alerta contratos próximos a vencer
 * Se ejecuta diariamente — crea alertas para contratos que vencen en los próximos 7 días.
 */
export async function GET(req: NextRequest) {
  const cronError = requireCron(req);
  if (cronError) return cronError;

  try {
    const now = new Date();
    const sieteDias = new Date(now);
    sieteDias.setDate(now.getDate() + 7);

    // Buscar contratos activos que vencen dentro de 7 días
    const contratosPorVencer = await prisma.contrato.findMany({
      where: {
        estado: "ACTIVO",
        fechaFin: {
          gte: now,
          lte: sieteDias,
        },
      },
      include: {
        cliente: { select: { nombre: true, email: true } },
        moto: { select: { marca: true, modelo: true, patente: true } },
      },
    });

    let alertasCreadas = 0;

    for (const contrato of contratosPorVencer) {
      const diasRestantes = Math.ceil(
        (contrato.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      await prisma.alerta.create({
        data: {
          tipo: "CONTRATO_POR_VENCER",
          mensaje: `Contrato ${contrato.id.slice(0, 8)} vence en ${diasRestantes} día(s) — ${contrato.moto.marca} ${contrato.moto.modelo} (${contrato.moto.patente}), Cliente: ${contrato.cliente.nombre}`,
          contratoId: contrato.id,
          metadata: {
            clienteId: contrato.clienteId,
            motoId: contrato.motoId,
            fechaFin: contrato.fechaFin,
            diasRestantes,
            renovacionAuto: contrato.renovacionAuto,
          },
        },
      });

      alertasCreadas++;
    }

    return NextResponse.json({
      ok: true,
      contratosPorVencer: contratosPorVencer.length,
      alertasCreadas,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[CRON] Error en contratos-por-vencer:", error);
    return NextResponse.json(
      { error: "Error al procesar contratos por vencer", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
