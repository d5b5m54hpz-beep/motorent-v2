import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { requireRole } from "@/lib/authz";
import { createPaymentPreference } from "@/lib/mercadopago";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.payment.checkout,
    "execute",
    ["CLIENTE", "ADMIN"]
  );
  if (error) return error;

  // Need role for ownership check below
  const { role } = await requireRole(["CLIENTE", "ADMIN"]);

  const { id } = await context.params;

  try {
    // Obtener el pago con toda la información necesaria
    const pago = await prisma.pago.findUnique({
      where: { id },
      include: {
        contrato: {
          include: {
            cliente: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
            moto: {
              select: {
                marca: true,
                modelo: true,
              },
            },
          },
        },
      },
    });

    if (!pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    // Verificar que el pago pertenece al usuario (o es admin)
    if (role !== "ADMIN" && pago.contrato.cliente.userId !== userId) {
      return NextResponse.json(
        { error: "No tienes permiso para pagar este pago" },
        { status: 403 }
      );
    }

    // Verificar que el pago está pendiente
    if (pago.estado !== "pendiente") {
      return NextResponse.json(
        { error: `Este pago ya está ${pago.estado}` },
        { status: 400 }
      );
    }

    // Calcular número de cuota
    const allPagos = await prisma.pago.findMany({
      where: { contratoId: pago.contratoId },
      orderBy: { vencimientoAt: "asc" },
    });
    const cuotaNumber = allPagos.findIndex((p) => p.id === pago.id) + 1;

    // Crear preferencia de pago en MercadoPago
    const preference = await createPaymentPreference({
      externalReference: pago.id,
      title: `Alquiler ${pago.contrato.moto.marca} ${pago.contrato.moto.modelo} - Cuota ${cuotaNumber}`,
      description: `Pago de alquiler - Vencimiento: ${pago.vencimientoAt?.toLocaleDateString("es-AR")}`,
      amount: pago.monto,
      payerEmail: pago.contrato.cliente.email,
      payerName: pago.contrato.cliente.nombre ?? undefined,
    });

    // Retornar el init_point para redirigir al checkout
    return NextResponse.json({
      initPoint: preference.init_point,
      preferenceId: preference.id,
    });
  } catch (error: unknown) {
    console.error("Error creating MercadoPago checkout:", error);
    return NextResponse.json(
      { error: "Error al crear el checkout de pago" },
      { status: 500 }
    );
  }
}
