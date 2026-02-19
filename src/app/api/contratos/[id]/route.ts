import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { ContractStateMachine } from "@/lib/services/contract-state-machine";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/contratos/[id] — get single contrato with full details
export async function GET(_req: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(
    OPERATIONS.rental.contract.view,
    "view",
    ["OPERADOR"]
  );
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
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  return NextResponse.json(contrato);
}

// PUT /api/contratos/[id] — update contrato (limited updates)
export async function PUT(req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.rental.contract.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const { notas, renovacionAuto, estado } = body;

    const existing = await prisma.contrato.findUnique({
      where: { id },
      include: {
        pagos: { where: { estado: "APROBADO" } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    // No permitir cambios de moto/cliente si hay pagos aprobados
    if (existing.pagos.length > 0 && (body.motoId || body.clienteId)) {
      return NextResponse.json(
        { error: "No se puede cambiar moto/cliente en contrato con pagos aprobados" },
        { status: 409 }
      );
    }

    // Validar transición de estado con la state machine
    if (estado && estado !== existing.estado) {
      try {
        ContractStateMachine.validateTransition(existing.estado, estado);
      } catch (err: unknown) {
        if (err instanceof Error) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }

      // Regla especial: activar requiere cliente aprobado + moto disponible
      if (estado === "ACTIVO") {
        const check = await ContractStateMachine.canActivate(id);
        if (!check.valid) {
          return NextResponse.json({ error: check.reason }, { status: 400 });
        }
      }
    }

    const newEstado = estado || existing.estado;

    const contrato = await prisma.contrato.update({
      where: { id },
      data: {
        notas,
        renovacionAuto,
        estado: newEstado,
      },
      include: {
        cliente: { select: { nombre: true, email: true, dni: true } },
        moto: { select: { marca: true, modelo: true, patente: true } },
        _count: { select: { pagos: true } },
      },
    });

    // Emitir eventos de transición de estado
    if (estado && estado !== existing.estado) {
      let operationId: string = OPERATIONS.rental.contract.update;

      if (estado === "ACTIVO" && existing.estado === "PENDIENTE") {
        operationId = OPERATIONS.rental.contract.activate;
      } else if (estado === "CANCELADO" || estado === "FINALIZADO" || estado === "FINALIZADO_COMPRA") {
        operationId = OPERATIONS.rental.contract.terminate;
      }

      eventBus.emit(
        operationId,
        "Contrato",
        id,
        { estadoAnterior: existing.estado, estadoNuevo: estado },
        userId
      ).catch((err) => {
        console.error(`Error emitting ${operationId} event:`, err);
      });
    }

    return NextResponse.json(contrato);
  } catch (error: unknown) {
    console.error("Error updating contrato:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE /api/contratos/[id] — cancel contrato (soft delete)
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { error, userId } = await requirePermission(
    OPERATIONS.rental.contract.terminate,
    "execute"
  );
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
      return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
    }

    if (contrato.estado === "CANCELADO") {
      return NextResponse.json({ error: "El contrato ya está cancelado" }, { status: 409 });
    }

    // Validar transición antes de proceder
    try {
      ContractStateMachine.validateTransition(contrato.estado, "CANCELADO");
    } catch (err: unknown) {
      if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    const estadoAnterior = contrato.estado;

    await prisma.$transaction(async (tx) => {
      await tx.contrato.update({
        where: { id },
        data: { estado: "CANCELADO" },
      });

      await tx.pago.updateMany({
        where: { contratoId: id, estado: "PENDIENTE" },
        data: { estado: "CANCELADO" },
      });

      await tx.moto.update({
        where: { id: contrato.motoId },
        data: { estado: "DISPONIBLE" },
      });
    });

    eventBus.emit(
      OPERATIONS.rental.contract.terminate,
      "Contrato",
      id,
      { estadoAnterior, estadoNuevo: "CANCELADO", motoId: contrato.motoId },
      userId
    ).catch((err) => {
      console.error("Error emitting rental.contract.terminate event:", err);
    });

    return NextResponse.json({
      message: "Contrato cancelado. Moto devuelta a disponible y pagos pendientes cancelados.",
    });
  } catch (error: unknown) {
    console.error("Error canceling contrato:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
