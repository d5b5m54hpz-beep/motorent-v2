import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Verify cron secret to prevent unauthorized access
function verifyCron(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET) return true; // Allow in dev
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

// GET /api/jobs/vencimientos
// Runs daily at 3:00 AM (configured in vercel.json)
// Marks payments as "vencido" when past due date
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const updated = await prisma.pago.updateMany({
    where: {
      estado: "pendiente",
      vencimientoAt: { lt: now },
    },
    data: { estado: "vencido" },
  });

  // Create alerts for overdue payments
  if (updated.count > 0) {
    const overdue = await prisma.pago.findMany({
      where: { estado: "vencido" },
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
