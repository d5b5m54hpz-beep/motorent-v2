import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentInfo, verifyWebhookSignature } from "@/lib/mercadopago";
import { PaymentService } from "@/lib/services/payment-service";

// Este endpoint NO requiere autenticación (MercadoPago lo llama directamente)
export async function POST(req: NextRequest) {
  try {
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json();

    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ received: true, error: "Missing payment ID" });
    }

    // Verificar firma HMAC (obligatorio)
    const isValid = verifyWebhookSignature(xSignature, xRequestId, paymentId);
    if (!isValid) {
      console.error(`[MP Webhook] Invalid signature for payment ${paymentId}`);
      return NextResponse.json({ received: true, error: "Invalid signature" }, { status: 401 });
    }

    // Consultar información del pago en MercadoPago
    const mpPayment = await getPaymentInfo(paymentId);

    // Verificar monto si el pago fue aprobado
    if (mpPayment.status === "approved" && mpPayment.transaction_amount != null) {
      const externalRef = mpPayment.external_reference;
      if (externalRef) {
        const pago = await prisma.pago.findUnique({ where: { id: externalRef } });
        if (pago) {
          const expectedAmount = Number(pago.monto);
          const paidAmount = Number(mpPayment.transaction_amount);
          if (Math.abs(paidAmount - expectedAmount) > 0.01) {
            console.error(
              `[MP Webhook] Amount mismatch for pago ${externalRef}: expected ${expectedAmount}, got ${paidAmount}`
            );
            return NextResponse.json(
              { received: true, error: "Amount mismatch", expected: expectedAmount, paid: paidAmount }
            );
          }
        }
      }
    }

    // Delegar al PaymentService — maneja idempotencia y state machine
    const result = await PaymentService.processWebhook(
      String(mpPayment.id),
      String(mpPayment.status ?? ""),
      mpPayment.external_reference ?? undefined
    );

    // Siempre retornar 200 OK (MercadoPago lo requiere)
    return NextResponse.json({ received: true, ...result });
  } catch (error: unknown) {
    console.error("[MP Webhook] Error processing webhook:", error);
    // Retornar 200 para que MP no reintente indefinidamente
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}
