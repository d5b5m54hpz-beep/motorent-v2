import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus, OPERATIONS } from "@/lib/events";
import { requireCron } from "@/lib/auth/require-cron";

/**
 * Cron job: Safety net para pagos aprobados sin factura.
 * Se ejecuta diariamente — re-emite el evento payment.approve para que
 * el handler de facturación (idempotente) genere la factura faltante.
 *
 * Schedule: 0 4 * * * (4:00 AM diario)
 */
export async function GET(req: NextRequest) {
  const cronError = requireCron(req);
  if (cronError) return cronError;

  try {
    // Buscar pagos APROBADOS sin factura asociada (creados hace más de 5 minutos)
    const hace5Minutos = new Date(Date.now() - 5 * 60 * 1000);

    const pagosSinFactura = await prisma.pago.findMany({
      where: {
        estado: "APROBADO",
        factura: null,
        pagadoAt: { lt: hace5Minutos },
      },
      include: {
        contrato: true,
      },
      take: 100, // Procesar de a 100 por ejecución
    });

    let procesados = 0;
    const errores: string[] = [];

    for (const pago of pagosSinFactura) {
      try {
        // Re-emitir evento — el handler de invoicing es idempotente
        await eventBus.emit(
          OPERATIONS.payment.approve,
          "Pago",
          pago.id,
          {
            previousEstado: "PENDIENTE",
            newEstado: "APROBADO",
            monto: pago.monto,
            metodo: pago.metodo,
            contratoId: pago.contratoId,
          },
          "system-job"
        );
        procesados++;
      } catch (err) {
        const msg = `Pago ${pago.id}: ${err instanceof Error ? err.message : "error desconocido"}`;
        errores.push(msg);
        console.error(`[job/facturar-pagos] ${msg}`);
      }
    }

    return NextResponse.json({
      message: `${procesados} pagos sin factura procesados`,
      procesados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error: unknown) {
    console.error("[job/facturar-pagos] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
