import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { registrarPagoSchema } from "@/lib/validations";
import { enviarFacturaEmail } from "@/lib/email";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/pagos/[id] — get single pago with full details
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(
    OPERATIONS.payment.view,
    "view",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      contrato: {
        include: {
          cliente: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          moto: true,
        },
      },
    },
  });

  if (!pago) {
    return NextResponse.json(
      { error: "Pago no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(pago);
}

// PUT /api/pagos/[id] — registrar/actualizar pago
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.payment.update,
    "execute",
    ["OPERADOR"] // fallback: OPERADOR keeps working during migration
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = registrarPagoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { estado, metodo, mpPaymentId, comprobante, notas } = parsed.data;

    const existing = await prisma.pago.findUnique({
      where: { id },
      include: {
        contrato: {
          include: {
            pagos: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    // Verificar permisos: solo ADMIN puede modificar pagos aprobados
    if (existing.estado === "APROBADO" || existing.estado === "REEMBOLSADO") {
      const { error: adminError } = await requirePermission(
        OPERATIONS.payment.approve,
        "execute"
        // No fallback roles: only ADMIN (implicit) can modify approved/refunded payments
      );
      if (adminError) {
        return NextResponse.json(
          { error: "Solo ADMIN puede modificar pagos aprobados o reembolsados" },
          { status: 403 }
        );
      }
    }

    // Track whether this is a state transition (for event emission)
    const previousEstado = existing.estado;

    // Actualizar pago en transacción
    let facturaId: string | null = null;

    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar pago
      const pagoActualizado = await tx.pago.update({
        where: { id },
        data: {
          estado,
          metodo: metodo || existing.metodo,
          mpPaymentId: mpPaymentId || existing.mpPaymentId,
          comprobante: comprobante || existing.comprobante,
          notas: notas || existing.notas,
          pagadoAt: estado === "APROBADO" ? new Date() : existing.pagadoAt,
        },
        include: {
          contrato: {
            include: {
              cliente: { select: { nombre: true, email: true, dni: true } },
              moto: { select: { marca: true, modelo: true, patente: true } },
            },
          },
        },
      });

      // Si se aprobó, generar factura automáticamente
      if (estado === "APROBADO" && existing.estado !== "APROBADO") {
        // Solo si no estaba aprobado antes (para evitar duplicados)

        // Obtener el último número de factura para calcular el siguiente
        const ultimaFactura = await tx.factura.findFirst({
          orderBy: { numero: "desc" },
        });

        const proximoNumero = ultimaFactura
          ? String(parseInt(ultimaFactura.numero) + 1).padStart(8, "0")
          : "00000001";

        // Calcular montos según tipo de factura
        const tipo = "B" as "A" | "B" | "C"; // Por defecto tipo B
        const montoTotal = Number(pagoActualizado.monto);
        const montoNeto = tipo === "A" ? montoTotal / 1.21 : montoTotal;
        const montoIva = tipo === "A" ? montoTotal - montoNeto : 0;

        // Crear la factura
        const factura = await tx.factura.create({
          data: {
            numero: proximoNumero,
            tipo,
            puntoVenta: 1,
            montoNeto,
            montoIva,
            montoTotal,
            emitida: false, // Hasta que se integre AFIP
            pagoId: pagoActualizado.id,
          },
        });

        // Guardar el ID de la factura para enviar email después
        facturaId = factura.id;
      }

      // Verificar si todos los pagos del contrato están aprobados
      if (estado === "APROBADO") {
        const todosLosPagos = await tx.pago.findMany({
          where: { contratoId: existing.contratoId },
        });

        const todosPagados = todosLosPagos.every(
          (p) => p.estado === "APROBADO" || p.estado === "CANCELADO"
        );

        if (todosPagados) {
          // Marcar contrato como finalizado y moto como disponible
          await tx.contrato.update({
            where: { id: existing.contratoId },
            data: { estado: "FINALIZADO" },
          });

          await tx.moto.update({
            where: { id: existing.contrato.motoId },
            data: { estado: "DISPONIBLE" },
          });
        }
      }

      return pagoActualizado;
    });

    // Emit events for state transitions
    if (estado !== previousEstado) {
      if (estado === "APROBADO") {
        eventBus.emit(
          OPERATIONS.payment.approve,
          "Pago",
          id,
          {
            previousEstado,
            newEstado: estado,
            monto: resultado.monto,
            metodo: resultado.metodo,
            contratoId: resultado.contratoId,
          },
          userId
        ).catch((err) => {
          console.error("Error emitting payment.approve event:", err);
        });
      } else if (estado === "RECHAZADO") {
        eventBus.emit(
          OPERATIONS.payment.reject,
          "Pago",
          id,
          {
            previousEstado,
            newEstado: estado,
            monto: resultado.monto,
            contratoId: resultado.contratoId,
          },
          userId
        ).catch((err) => {
          console.error("Error emitting payment.reject event:", err);
        });
      } else if (estado === "REEMBOLSADO") {
        eventBus.emit(
          OPERATIONS.payment.refund,
          "Pago",
          id,
          {
            previousEstado,
            newEstado: estado,
            monto: resultado.monto,
            contratoId: resultado.contratoId,
          },
          userId
        ).catch((err) => {
          console.error("Error emitting payment.refund event:", err);
        });
      }
    }

    // Enviar email con factura (fire and forget - no bloquea la respuesta)
    if (facturaId) {
      enviarFacturaEmail(facturaId).catch((error) => {
        console.error("Error sending factura email (non-blocking):", error);
      });
    }

    return NextResponse.json(resultado);
  } catch (error: unknown) {
    console.error("Error updating pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
