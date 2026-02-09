import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { contratoSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/contratos/[id] — get single contrato with full details
export async function GET(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      cliente: {
        include: {
          user: { select: { name: true, email: true, phone: true, image: true } },
        },
      },
      moto: true,
      pagos: {
        include: {
          factura: true,
        },
        orderBy: { vencimientoAt: "asc" },
      },
    },
  });

  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(contrato);
}

// PUT /api/contratos/[id] — update contrato (limited updates)
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();

    // Para edición, solo permitimos cambiar ciertos campos
    const { notas, renovacionAuto, estado } = body;

    const existing = await prisma.contrato.findUnique({
      where: { id },
      include: {
        pagos: { where: { estado: "pagado" } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    // No permitir cambios si hay pagos aprobados
    if (existing.pagos.length > 0 && (body.motoId || body.clienteId)) {
      return NextResponse.json(
        { error: "No se puede cambiar moto/cliente en contrato con pagos aprobados" },
        { status: 409 }
      );
    }

    const contrato = await prisma.contrato.update({
      where: { id },
      data: {
        notas,
        renovacionAuto,
        estado: estado || existing.estado,
      },
      include: {
        cliente: { select: { nombre: true, email: true, dni: true } },
        moto: { select: { marca: true, modelo: true, patente: true } },
        _count: { select: { pagos: true } },
      },
    });

    return NextResponse.json(contrato);
  } catch (error: unknown) {
    console.error("Error updating contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/contratos/[id] — cancel contrato (soft delete)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: {
        pagos: true,
        moto: true,
      },
    });

    if (!contrato) {
      return NextResponse.json(
        { error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    if (contrato.estado === "cancelado") {
      return NextResponse.json(
        { error: "El contrato ya esta cancelado" },
        { status: 409 }
      );
    }

    // Cancelar contrato en transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar estado del contrato
      await tx.contrato.update({
        where: { id },
        data: { estado: "cancelado" },
      });

      // Cancelar pagos pendientes
      await tx.pago.updateMany({
        where: {
          contratoId: id,
          estado: "pendiente",
        },
        data: { estado: "cancelado" },
      });

      // Devolver moto a disponible
      await tx.moto.update({
        where: { id: contrato.motoId },
        data: { estado: "disponible" },
      });
    });

    return NextResponse.json({
      message: "Contrato cancelado. Moto devuelta a disponible y pagos pendientes cancelados.",
    });
  } catch (error: unknown) {
    console.error("Error canceling contrato:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
