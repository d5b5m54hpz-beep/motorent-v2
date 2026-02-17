import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { z } from "zod";

const actualizarPrecioSchema = z.object({
  precio: z.number().min(0),
  motivo: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.bulk_update, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = actualizarPrecioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { precio, motivo } = parsed.data;

    // Obtener repuesto actual
    const repuesto = await prisma.repuesto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        precioVenta: true,
        costoPromedioArs: true,
      },
    });

    if (!repuesto) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    const precioAnterior = repuesto.precioVenta;
    const margenAnterior =
      precioAnterior > 0
        ? (precioAnterior - repuesto.costoPromedioArs) / precioAnterior
        : null;
    const margenNuevo =
      precio > 0 ? (precio - repuesto.costoPromedioArs) / precio : null;

    // Actualizar precio + crear registro en historial
    await prisma.$transaction(async (tx) => {
      // Actualizar precio
      await tx.repuesto.update({
        where: { id },
        data: { precioVenta: precio },
      });

      // Crear registro en historial
      await tx.historialPrecioRepuesto.create({
        data: {
          repuestoId: id,
          precioAnterior,
          precioNuevo: precio,
          tipoCambio: "MANUAL",
          motivo: motivo || "Edición manual desde lista de precios",
          costoAlMomento: repuesto.costoPromedioArs,
          margenAlMomento: margenNuevo,
          usuario: userId || "Usuario",
        },
      });
    });

    eventBus.emit(OPERATIONS.pricing.parts.bulk_update, "Repuesto", id, { nombre: repuesto.nombre, precioAnterior, precioNuevo: precio }, userId).catch(err => console.error("Error emitting pricing.parts.bulk_update event:", err));

    return NextResponse.json({
      success: true,
      repuesto: {
        id: repuesto.id,
        nombre: repuesto.nombre,
        codigo: repuesto.codigo,
      },
      precioAnterior,
      precioNuevo: precio,
      margenAnterior: margenAnterior ? (margenAnterior * 100).toFixed(1) + "%" : "N/A",
      margenNuevo: margenNuevo ? (margenNuevo * 100).toFixed(1) + "%" : "N/A",
    });
  } catch (err: unknown) {
    console.error("Error actualizando precio:", err);
    return NextResponse.json(
      { error: "Error al actualizar precio" },
      { status: 500 }
    );
  }
}
