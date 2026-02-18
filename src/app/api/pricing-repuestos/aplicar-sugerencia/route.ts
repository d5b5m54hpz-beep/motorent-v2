import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { z } from "zod";

const aplicarSugerenciaSchema = z.object({
  repuestoId: z.string(),
  nuevoPrecio: z.number().min(0),
  motivo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.apply_suggestion, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = aplicarSugerenciaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { repuestoId, nuevoPrecio, motivo } = parsed.data;

    // Obtener repuesto actual
    const repuesto = await prisma.repuesto.findUnique({
      where: { id: repuestoId },
      select: {
        id: true,
        nombre: true,
        precioVenta: true,
        costoPromedioArs: true,
      },
    });

    if (!repuesto) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    const precioAnterior = Number(repuesto.precioVenta);
    const costoPromArs = Number(repuesto.costoPromedioArs);
    const margenAnterior =
      precioAnterior > 0
        ? (precioAnterior - costoPromArs) / precioAnterior
        : null;
    const margenNuevo =
      nuevoPrecio > 0 ? (nuevoPrecio - costoPromArs) / nuevoPrecio : null;

    // Actualizar precio + crear registro en historial
    await prisma.$transaction(async (tx) => {
      // Actualizar precio
      await tx.repuesto.update({
        where: { id: repuestoId },
        data: { precioVenta: nuevoPrecio },
      });

      // Crear registro en historial
      await tx.historialPrecioRepuesto.create({
        data: {
          repuestoId,
          precioAnterior,
          precioNuevo: nuevoPrecio,
          tipoCambio: "SUGERENCIA_IA",
          motivo: motivo || "Aplicación de sugerencia del sistema",
          costoAlMomento: repuesto.costoPromedioArs,
          margenAlMomento: margenNuevo,
          usuario: userId || "Sistema",
        },
      });
    });

    eventBus.emit(OPERATIONS.pricing.parts.apply_suggestion, "Repuesto", repuestoId, { nombre: repuesto.nombre, precioAnterior, precioNuevo: nuevoPrecio }, userId).catch(err => console.error("Error emitting pricing.parts.apply_suggestion event:", err));

    return NextResponse.json({
      success: true,
      repuesto: repuesto.nombre,
      precioAnterior,
      precioNuevo: nuevoPrecio,
      margenAnterior: margenAnterior ? (margenAnterior * 100).toFixed(1) + "%" : "N/A",
      margenNuevo: margenNuevo ? (margenNuevo * 100).toFixed(1) + "%" : "N/A",
    });
  } catch (err: unknown) {
    console.error("Error aplicando sugerencia:", err);
    return NextResponse.json(
      { error: "Error al aplicar sugerencia" },
      { status: 500 }
    );
  }
}
