import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentInfo, verifyWebhookSignature } from "@/lib/mercadopago";
import { eventBus, OPERATIONS } from "@/lib/events";
import { checkAndFinalizeContrato } from "@/lib/services/contrato-finalization";

// Este endpoint NO requiere autenticación (MercadoPago lo llama directamente)
export async function POST(req: NextRequest) {
  try {
    // Obtener headers de verificación
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json();

    // Validar que sea una notificación de payment
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    // Verificar signature (opcional en test)
    const isValid = verifyWebhookSignature(xSignature, xRequestId, paymentId);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Consultar información del pago en MercadoPago
    const mpPayment = await getPaymentInfo(paymentId);

    // Buscar el pago en nuestra DB por external_reference
    const pagoId = mpPayment.external_reference;
    if (!pagoId) {
      return NextResponse.json({ error: "Missing external_reference" }, { status: 400 });
    }

    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: {
        contrato: {
          include: {
            cliente: true,
            moto: true,
            pagos: true,
          },
        },
      },
    });

    if (!pago) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verificar idempotencia: si ya fue procesado, retornar OK
    if (pago.mpPaymentId === String(mpPayment.id)) {
      return NextResponse.json({ received: true, message: "Already processed" });
    }

    // Verificar monto: el monto pagado debe coincidir con el esperado
    if (mpPayment.status === "approved" && mpPayment.transaction_amount != null) {
      const expectedAmount = Number(pago.monto);
      const paidAmount = Number(mpPayment.transaction_amount);
      if (Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.error(
          `[MP Webhook] Amount mismatch for pago ${pagoId}: expected ${expectedAmount}, got ${paidAmount}`
        );
        return NextResponse.json(
          { error: "Amount mismatch", expected: expectedAmount, received: paidAmount },
          { status: 400 }
        );
      }
    }

    // Verificar que el pago no esté en estado terminal
    if (pago.estado === "REEMBOLSADO" || pago.estado === "CANCELADO") {
      return NextResponse.json({ received: true, message: "Payment in terminal state" });
    }

    // Procesar según el estado del pago
    if (mpPayment.status === "approved") {
      const previousEstado = pago.estado;

      await prisma.$transaction(async (tx) => {
        await tx.pago.update({
          where: { id: pagoId },
          data: {
            estado: "APROBADO",
            metodo: "MERCADOPAGO",
            mpPaymentId: String(mpPayment.id),
            pagadoAt: new Date(),
            referencia: mpPayment.id ? String(mpPayment.id) : undefined,
          },
        });

        // Check if all pagos settled → finalize contrato + release moto
        await checkAndFinalizeContrato(tx, pago.contratoId, pago.contrato.motoId);
      });

      // Emit payment.approve → triggers invoicing (factura), accounting, notifications
      eventBus.emit(
        OPERATIONS.payment.approve,
        "Pago",
        pagoId,
        {
          previousEstado,
          newEstado: "APROBADO",
          monto: pago.monto,
          metodo: "MERCADOPAGO",
          contratoId: pago.contratoId,
        },
        null // No userId for webhook-initiated events
      ).catch((err) => {
        console.error("Error emitting payment.approve from MP webhook:", err);
      });

    } else if (mpPayment.status === "rejected") {
      const previousEstado = pago.estado;

      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          estado: "RECHAZADO",
          mpPaymentId: String(mpPayment.id),
          notas: `Pago rechazado por MercadoPago. Motivo: ${mpPayment.status_detail}`,
        },
      });

      // Emit payment.reject → triggers notifications
      eventBus.emit(
        OPERATIONS.payment.reject,
        "Pago",
        pagoId,
        {
          previousEstado,
          newEstado: "RECHAZADO",
          monto: pago.monto,
          contratoId: pago.contratoId,
          statusDetail: mpPayment.status_detail,
        },
        null
      ).catch((err) => {
        console.error("Error emitting payment.reject from MP webhook:", err);
      });

    } else if (mpPayment.status === "pending" || mpPayment.status === "in_process") {
      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          mpPaymentId: String(mpPayment.id),
          notas: `Pago en proceso. Estado: ${mpPayment.status}`,
        },
      });
    }

    // Siempre retornar 200 OK (MercadoPago lo requiere)
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    // Aún con error, retornar 200 para que MP no reintente
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}
