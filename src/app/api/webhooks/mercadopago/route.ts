import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentInfo, verifyWebhookSignature } from "@/lib/mercadopago";
import { eventBus, OPERATIONS } from "@/lib/events";

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
      return NextResponse.json({ received: true, error: "Missing payment ID" });
    }

    // Verificar HMAC signature (mandatory in production, skip in dev if no secret)
    const isValid = verifyWebhookSignature(xSignature, xRequestId, paymentId);
    if (!isValid) {
      console.error(`[MP Webhook] Invalid signature for payment ${paymentId}`);
      return NextResponse.json({ received: true, error: "Invalid signature" });
    }

    // Consultar información del pago en MercadoPago
    const mpPayment = await getPaymentInfo(paymentId);

    // Buscar el pago en nuestra DB por external_reference
    const pagoId = mpPayment.external_reference;
    if (!pagoId) {
      console.error(`[MP Webhook] Missing external_reference for MP payment ${paymentId}`);
      return NextResponse.json({ received: true, error: "Missing external_reference" });
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
      console.error(`[MP Webhook] Pago not found for external_reference: ${pagoId}`);
      return NextResponse.json({ received: true, error: "Payment not found" });
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
        return NextResponse.json({ received: true, error: "Amount mismatch", expected: expectedAmount, paid: paidAmount });
      }
    }

    // Verificar que el pago no esté en estado terminal
    if (pago.estado === "REEMBOLSADO" || pago.estado === "CANCELADO") {
      return NextResponse.json({ received: true, message: "Payment in terminal state" });
    }

    // Procesar según el estado del pago
    if (mpPayment.status === "approved") {
      const previousEstado = pago.estado;

      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          estado: "APROBADO",
          metodo: "MERCADOPAGO",
          mpPaymentId: String(mpPayment.id),
          pagadoAt: new Date(),
          referencia: mpPayment.id ? String(mpPayment.id) : undefined,
        },
      });

      // Emit payment.approve → triggers invoicing (factura + contrato finalization), accounting, notifications
      await eventBus.emit(
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
      );

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
      await eventBus.emit(
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
      );

    } else if (mpPayment.status === "cancelled") {
      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          estado: "CANCELADO",
          mpPaymentId: String(mpPayment.id),
          notas: `Pago cancelado por MercadoPago. Motivo: ${mpPayment.status_detail || "cancelled"}`,
        },
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
