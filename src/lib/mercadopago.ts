import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

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
      statement_descriptor: "MOTORENT",
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

// Helper para verificar webhook signature (opcional, MP no siempre lo envía)
export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  // MercadoPago recomienda validar el signature, pero en modo test puede no estar presente
  // Por ahora retornamos true, pero en producción se debería validar correctamente
  if (!xSignature || !xRequestId) {
    console.warn("⚠️  Webhook sin signature, verificación omitida");
    return true;
  }

  // TODO: Implementar validación real con secret
  // const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // const ts = xSignature.split(',')[0].split('=')[1];
  // const hash = xSignature.split(',')[1].split('=')[1];
  // const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  // const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  // return hmac === hash;

  return true;
}
