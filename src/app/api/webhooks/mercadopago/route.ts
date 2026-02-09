import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentInfo, verifyWebhookSignature } from "@/lib/mercadopago";

// Este endpoint NO requiere autenticación (MercadoPago lo llama directamente)
export async function POST(req: NextRequest) {
  try {
    // Obtener headers de verificación
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const body = await req.json();

    console.log("🔔 MercadoPago Webhook recibido:", {
      type: body.type,
      action: body.action,
      data: body.data,
    });

    // Validar que sea una notificación de payment
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      console.log("ℹ️  Notificación ignorada (no es payment)");
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error("❌ No se recibió payment ID");
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    // Verificar signature (opcional en test)
    const isValid = verifyWebhookSignature(xSignature, xRequestId, paymentId);
    if (!isValid) {
      console.error("❌ Signature inválida");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Consultar información del pago en MercadoPago
    const mpPayment = await getPaymentInfo(paymentId);

    console.log("💳 Info del pago de MP:", {
      id: mpPayment.id,
      status: mpPayment.status,
      external_reference: mpPayment.external_reference,
      transaction_amount: mpPayment.transaction_amount,
    });

    // Buscar el pago en nuestra DB por external_reference
    const pagoId = mpPayment.external_reference;
    if (!pagoId) {
      console.error("❌ No hay external_reference en el pago de MP");
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
      console.error("❌ Pago no encontrado en DB:", pagoId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verificar idempotencia: si ya fue procesado, retornar OK
    if (pago.mpPaymentId === String(mpPayment.id)) {
      console.log("ℹ️  Pago ya procesado anteriormente");
      return NextResponse.json({ received: true, message: "Already processed" });
    }

    // Procesar según el estado del pago
    if (mpPayment.status === "approved") {
      console.log("✅ Pago aprobado, actualizando DB...");

      await prisma.$transaction(async (tx) => {
        // Actualizar el pago
        await tx.pago.update({
          where: { id: pagoId },
          data: {
            estado: "aprobado",
            metodo: "mercadopago",
            mpPaymentId: String(mpPayment.id),
            pagadoAt: new Date(),
            referencia: mpPayment.id ? String(mpPayment.id) : undefined,
          },
        });

        // Generar factura automáticamente (mismo código que en pagos/[id]/route.ts)
        const ultimaFactura = await tx.factura.findFirst({
          orderBy: { numero: "desc" },
        });

        const proximoNumero = ultimaFactura
          ? String(parseInt(ultimaFactura.numero) + 1).padStart(8, "0")
          : "00000001";

        const tipo = "B" as "A" | "B" | "C";
        const montoTotal = pago.monto;
        const montoNeto = tipo === "A" ? montoTotal / 1.21 : montoTotal;
        const montoIva = tipo === "A" ? montoTotal - montoNeto : 0;

        await tx.factura.create({
          data: {
            numero: proximoNumero,
            tipo,
            puntoVenta: 1,
            montoNeto,
            montoIva,
            montoTotal,
            emitida: false,
            pagoId: pago.id,
            razonSocial: pago.contrato.cliente.nombre,
            cuit: pago.contrato.cliente.dni || "",
          },
        });

        // Verificar si es el último pago del contrato
        const allPagos = pago.contrato.pagos;
        const pagosAprobados = allPagos.filter((p) => p.estado === "aprobado" || p.id === pagoId);

        if (pagosAprobados.length === allPagos.length) {
          // Todos los pagos están aprobados, finalizar contrato
          console.log("✅ Último pago aprobado, finalizando contrato...");

          await tx.contrato.update({
            where: { id: pago.contratoId },
            data: { estado: "finalizado" },
          });

          // Liberar la moto
          await tx.moto.update({
            where: { id: pago.contrato.motoId },
            data: { estado: "disponible" },
          });
        }
      });

      console.log("✅ Pago procesado exitosamente");
    } else if (mpPayment.status === "rejected") {
      console.log("❌ Pago rechazado");

      await prisma.pago.update({
        where: { id: pagoId },
        data: {
          estado: "rechazado",
          mpPaymentId: String(mpPayment.id),
          notas: `Pago rechazado por MercadoPago. Motivo: ${mpPayment.status_detail}`,
        },
      });
    } else if (mpPayment.status === "pending" || mpPayment.status === "in_process") {
      console.log("⏳ Pago pendiente/en proceso");

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
    console.error("❌ Error procesando webhook:", error);
    // Aún con error, retornar 200 para que MP no reintente
    return NextResponse.json({ received: true, error: "Internal error" });
  }
}
