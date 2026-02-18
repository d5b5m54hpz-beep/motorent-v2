import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCron } from "@/lib/auth/require-cron";

// GET /api/jobs/vencimientos
// Runs daily at 3:00 AM — marks payments as VENCIDO when past due date
export async function GET(req: NextRequest) {
  const cronError = requireCron(req);
  if (cronError) return cronError;

  const now = new Date();

  const updated = await prisma.pago.updateMany({
    where: {
      estado: "PENDIENTE",
      vencimientoAt: { lt: now },
    },
    data: { estado: "VENCIDO" },
  });

  // Create alerts for overdue payments
  if (updated.count > 0) {
    const overdue = await prisma.pago.findMany({
      where: { estado: "VENCIDO" },
      include: { contrato: true },
    });

    for (const pago of overdue) {
      await prisma.alerta.create({
        data: {
          tipo: "pago_vencido",
          mensaje: `Pago de $${pago.monto} vencido (Contrato ${pago.contrato.id})`,
          contratoId: pago.contratoId,
          pagoId: pago.id,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    pagosVencidos: updated.count,
    timestamp: now.toISOString(),
  });
}
