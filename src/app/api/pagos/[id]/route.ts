import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { registrarPagoSchema } from "@/lib/validations";
import { PaymentService } from "@/lib/services/payment-service";

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
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  return NextResponse.json(pago);
}

// PUT /api/pagos/[id] — registrar/actualizar pago
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.payment.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const parsed = registrarPagoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { estado, metodo, mpPaymentId, comprobante, notas } = parsed.data;

    const existing = await prisma.pago.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    // Solo ADMIN puede modificar pagos ya aprobados o reembolsados
    if (existing.estado === "APROBADO" || existing.estado === "REEMBOLSADO") {
      const { error: adminError } = await requirePermission(
        OPERATIONS.payment.approve,
        "execute"
      );
      if (adminError) {
        return NextResponse.json(
          { error: "Solo ADMIN puede modificar pagos aprobados o reembolsados" },
          { status: 403 }
        );
      }
    }

    try {
      switch (estado) {
        case "APROBADO":
          await PaymentService.approve(id, {
            metodo: metodo!,
            mpPaymentId: mpPaymentId ?? undefined,
            comprobante: comprobante ?? undefined,
            notas: notas ?? undefined,
            userId,
          });
          break;
        case "RECHAZADO":
          await PaymentService.reject(id, { notas: notas ?? undefined, userId });
          break;
        case "CANCELADO":
          await PaymentService.cancel(id, { notas: notas ?? undefined, userId });
          break;
        case "REEMBOLSADO":
          await PaymentService.refund(id, { notas: notas ?? undefined, userId });
          break;
        default:
          // Transiciones no manejadas por el service (ej: VENCIDO → PENDIENTE)
          PaymentService.validateTransition(existing.estado, estado);
          await prisma.pago.update({
            where: { id },
            data: { estado, notas: notas ?? existing.notas },
          });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Transición de pago inválida")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const pagoFull = await prisma.pago.findUnique({
      where: { id },
      include: {
        contrato: {
          include: {
            cliente: { select: { nombre: true, email: true, dni: true } },
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
        },
      },
    });

    return NextResponse.json(pagoFull);
  } catch (error: unknown) {
    console.error("Error updating pago:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
