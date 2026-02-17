import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { createHmac } from "crypto";

// Validar que las credenciales estén configuradas
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn("⚠️  MERCADOPAGO_ACCESS_TOKEN no está configurado");
}

// Inicializar cliente de MercadoPago
export const mercadopagoClient = process.env.MERCADOPAGO_ACCESS_TOKEN
  ? new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: "unique-key", // Cambiará por request
      },
    })
  : null;

// Helper para crear una preferencia de pago
export async function createPaymentPreference(params: {
  externalReference: string;
  title: string;
  description?: string;
  amount: number;
  payerEmail: string;
  payerName?: string;
}) {
  if (!mercadopagoClient) {
    throw new Error("MercadoPago no está configurado");
  }

  const preference = new Preference(mercadopagoClient);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.externalReference,
          title: params.title,
          description: params.description,
          quantity: 1,
          unit_price: params.amount,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: params.payerEmail,
        name: params.payerName,
      },
      external_reference: params.externalReference,
      back_urls: {
        success: `${appUrl}/mi-cuenta/pagos/resultado`,
        failure: `${appUrl}/mi-cuenta/pagos/resultado`,
        pending: `${appUrl}/mi-cuenta/pagos/resultado`,
      },
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      auto_return: "approved",
      statement_descriptor: "MOTOLIBRE",
      payment_methods: {
        excluded_payment_types: [],
        installments: 1, // Solo 1 cuota
      },
    },
  });

  return result;
}

// Helper para consultar el estado de un pago
export async function getPaymentInfo(paymentId: string) {
  if (!mercadopagoClient) {
    throw new Error("MercadoPago no está configurado");
  }

  const payment = new Payment(mercadopagoClient);
  const result = await payment.get({ id: paymentId });

  return result;
}

// Helper para verificar webhook signature
export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // Si no hay secret configurado o no viene signature, skip validation
  if (!secret || !xSignature || !xRequestId) {
    console.warn("⚠️  Webhook sin signature o sin secret configurado, verificación omitida");
    return true;
  }

  try {
    // Parse x-signature header: "ts=...,v1=..."
    const parts: Record<string, string> = {};
    xSignature.split(",").forEach((part) => {
      const [key, value] = part.trim().split("=", 2);
      if (key && value) parts[key] = value;
    });

    const ts = parts["ts"];
    const hash = parts["v1"];

    if (!ts || !hash) {
      console.warn("⚠️  Formato de x-signature inválido");
      return true;
    }

    // Build the manifest string as per MP docs
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Compute HMAC-SHA256
    const hmac = createHmac("sha256", secret).update(manifest).digest("hex");

    return hmac === hash;
  } catch (error) {
    console.error("Error verificando webhook signature:", error);
    return true; // Fail open to not lose payments
  }
}
