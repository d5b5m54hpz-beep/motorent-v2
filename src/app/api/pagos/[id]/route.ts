import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { registrarPagoSchema } from "@/lib/validations";
import { checkAndFinalizeContrato } from "@/lib/services/contrato-finalization";

type RouteContext = { params: Promise<{ id: string }> };

// State machine: valid transitions for EstadoPago
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ["APROBADO", "RECHAZADO", "CANCELADO", "VENCIDO"],
  APROBADO: ["REEMBOLSADO"],
  RECHAZADO: ["PENDIENTE", "CANCELADO"],
  VENCIDO: ["PENDIENTE", "CANCELADO"],
  REEMBOLSADO: [], // terminal
  CANCELADO: [],   // terminal
};

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

    // Validate state transition
    const allowed = VALID_TRANSITIONS[existing.estado] || [];
    if (!allowed.includes(estado)) {
      return NextResponse.json(
        { error: `Transición inválida: ${existing.estado} → ${estado}` },
        { status: 400 }
      );
    }

    // Track whether this is a state transition (for event emission)
    const previousEstado = existing.estado;

    // Actualizar pago en transacción
    const resultado = await prisma.$transaction(async (tx) => {
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

      // Check if all pagos settled → finalize contrato + release moto
      if (estado === "APROBADO") {
        await checkAndFinalizeContrato(tx, existing.contratoId, existing.contrato.motoId);
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

    return NextResponse.json(resultado);
  } catch (error: unknown) {
    console.error("Error updating pago:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
