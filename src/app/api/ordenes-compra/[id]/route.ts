import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ordenCompraSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.purchase_order.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    include: {
      proveedor: true,
      items: {
        include: {
          repuesto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              unidad: true,
              precioCompra: true,
            },
          },
        },
      },
      recepciones: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!oc) {
    return NextResponse.json(
      { error: "Orden de compra no encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(oc);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.purchase_order.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    if (existing.estado !== "BORRADOR") {
      return NextResponse.json(
        { error: "Solo se pueden editar órdenes en borrador" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = ordenCompraSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { proveedorId, items, notas, fechaEntregaEstimada } = parsed.data;

    const subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );
    const iva = subtotal * 0.21;
    const total = subtotal + iva;

    const oc = await prisma.$transaction(async (tx) => {
      await tx.itemOrdenCompra.deleteMany({ where: { ordenCompraId: id } });

      await tx.ordenCompra.update({
        where: { id },
        data: {
          proveedorId,
          fechaEntregaEstimada: fechaEntregaEstimada
            ? new Date(fechaEntregaEstimada)
            : null,
          subtotal,
          iva,
          total,
          notas,
        },
      });

      for (const item of items) {
        const subtotalItem = item.cantidad * item.precioUnitario;
        await tx.itemOrdenCompra.create({
          data: {
            ordenCompraId: id,
            repuestoId: item.repuestoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: subtotalItem,
          },
        });
      }

      return tx.ordenCompra.findUnique({
        where: { id },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          items: {
            include: {
              repuesto: { select: { id: true, nombre: true, codigo: true } },
            },
          },
        },
      });
    });

    // Emit update event
    eventBus.emit(
      OPERATIONS.inventory.purchase_order.update,
      "OrdenCompra",
      id,
      { proveedorId, items: items.length, montoTotal: total },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.purchase_order.update event:", err);
    });

    return NextResponse.json(oc);
  } catch (error: unknown) {
    console.error("Error updating orden de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.purchase_order.update,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.ordenCompra.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Orden de compra no encontrada" },
      { status: 404 }
    );
  }

  if (existing.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar órdenes en borrador" },
      { status: 400 }
    );
  }

  await prisma.ordenCompra.delete({ where: { id } });

  // Emit delete event
  eventBus.emit(
    OPERATIONS.inventory.purchase_order.update,
    "OrdenCompra",
    id,
    { numero: existing.numero, action: "delete" },
    userId
  ).catch((err) => {
    console.error("Error emitting inventory.purchase_order.update (delete) event:", err);
  });

  return NextResponse.json({ ok: true });
}
