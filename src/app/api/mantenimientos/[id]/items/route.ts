import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const itemSchema = z.object({
  tipo: z.enum(["REPUESTO", "MANO_OBRA", "INSUMO"]),
  descripcion: z.string().min(1),
  repuestoId: z.string().optional().nullable(),
  cantidad: z.number().positive(),
  precioUnitario: z.number().positive(),
  horasMecanico: z.number().positive().optional().nullable(),
  tarifaHora: z.number().positive().optional().nullable(),
});

// GET /api/mantenimientos/[id]/items — listar ítems de una OT
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { error } = await requirePermission(
      OPERATIONS.maintenance.workorder.item.view,
      "view",
      ["OPERADOR"]
    );
    if (error) return error;

    const { id } = await context.params;

    const items = await prisma.itemOT.findMany({
      where: { ordenTrabajoId: id },
      include: {
        repuesto: { select: { id: true, nombre: true, codigo: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error("Error fetching items OT:", error);
    return NextResponse.json(
      { error: "Error al obtener ítems", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

// POST /api/mantenimientos/[id]/items — agregar ítem a OT
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(
      OPERATIONS.maintenance.workorder.item.create,
      "create",
      ["OPERADOR"]
    );
    if (error) return error;

    const { id } = await context.params;

    const body = await req.json();
    const parsed = itemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Verificar que la OT existe y no está cerrada
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
    if (!ot) {
      return NextResponse.json({ error: "OT no encontrada" }, { status: 404 });
    }
    if (ot.estado === "COMPLETADA" || ot.estado === "CANCELADA") {
      return NextResponse.json(
        { error: "No se pueden agregar ítems a una OT cerrada" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const subtotal = data.cantidad * data.precioUnitario;

    const item = await prisma.itemOT.create({
      data: {
        ordenTrabajoId: id,
        tipo: data.tipo,
        descripcion: data.descripcion,
        repuestoId: data.repuestoId ?? null,
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario,
        subtotal,
        horasMecanico: data.horasMecanico ?? null,
        tarifaHora: data.tarifaHora ?? null,
        creadoPor: userId,
      },
      include: {
        repuesto: { select: { id: true, nombre: true, codigo: true } },
      },
    });

    // Actualizar costoTotal de la OT
    await recalcularCostoTotal(id);

    eventBus
      .emit(OPERATIONS.maintenance.workorder.item.create, "ItemOT", item.id, { otId: id, tipo: item.tipo, subtotal }, userId)
      .catch((err) => console.error("Error emitting item.create event:", err));

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating item OT:", error);
    return NextResponse.json(
      { error: "Error al agregar ítem", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

// DELETE /api/mantenimientos/[id]/items?itemId=xxx
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { error, userId } = await requirePermission(
      OPERATIONS.maintenance.workorder.item.delete,
      "execute",
      ["OPERADOR"]
    );
    if (error) return error;

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "itemId requerido" }, { status: 400 });
    }

    const ot = await prisma.ordenTrabajo.findUnique({ where: { id } });
    if (ot?.estado === "COMPLETADA" || ot?.estado === "CANCELADA") {
      return NextResponse.json({ error: "OT cerrada — no se puede modificar" }, { status: 400 });
    }

    await prisma.itemOT.delete({ where: { id: itemId } });
    await recalcularCostoTotal(id);

    eventBus
      .emit(OPERATIONS.maintenance.workorder.item.delete, "ItemOT", itemId, { otId: id }, userId)
      .catch((err) => console.error("Error emitting item.delete event:", err));

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error deleting item OT:", error);
    return NextResponse.json(
      { error: "Error al eliminar ítem", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

async function recalcularCostoTotal(otId: string) {
  const result = await prisma.itemOT.aggregate({
    where: { ordenTrabajoId: otId },
    _sum: { subtotal: true },
  });
  await prisma.ordenTrabajo.update({
    where: { id: otId },
    data: { costoTotal: result._sum.subtotal ?? 0 },
  });
}
