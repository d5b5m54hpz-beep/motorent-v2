import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  repuestoIds: z.array(z.string()).min(1),
  tipo: z.enum(["PORCENTAJE", "PRECIO_FIJO", "REGLA_MARGEN"]),
  valor: z.number().optional(), // porcentaje o precio fijo
  motivo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = bulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { repuestoIds, tipo, valor, motivo } = parsed.data;

    // Obtener repuestos
    const repuestos = await prisma.repuesto.findMany({
      where: { id: { in: repuestoIds }, activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        categoria: true,
        costoPromedioArs: true,
        precioVenta: true,
      },
    });

    if (repuestos.length === 0) {
      return NextResponse.json({ error: "No se encontraron repuestos" }, { status: 404 });
    }

    // Obtener configuración de categorías si es necesario
    const configCategorias = await prisma.categoriaRepuestoConfig.findMany({
      select: {
        categoria: true,
        margenObjetivo: true,
      },
    });

    const configMap = new Map(
      configCategorias.map((c) => [c.categoria, c])
    );

    // Generar lote ID para poder revertir después
    const loteId = `BULK_${Date.now()}`;

    // Calcular nuevos precios y actualizar
    const cambios = await prisma.$transaction(async (tx) => {
      const cambiosRealizados: any[] = [];

      for (const repuesto of repuestos) {
        let nuevoPrecio: number;

        switch (tipo) {
          case "PORCENTAJE":
            if (valor === undefined) {
              throw new Error("Valor de porcentaje requerido");
            }
            nuevoPrecio = Math.round(repuesto.precioVenta * (1 + valor / 100));
            break;

          case "PRECIO_FIJO":
            if (valor === undefined) {
              throw new Error("Precio fijo requerido");
            }
            nuevoPrecio = valor;
            break;

          case "REGLA_MARGEN":
            const config = configMap.get(repuesto.categoria || "");
            const margenObjetivo = config?.margenObjetivo || 0.45;
            nuevoPrecio = Math.ceil(
              (repuesto.costoPromedioArs / (1 - margenObjetivo)) / 10
            ) * 10;
            break;

          default:
            nuevoPrecio = repuesto.precioVenta;
        }

        // No actualizar si el precio no cambió
        if (nuevoPrecio === repuesto.precioVenta) continue;

        const margenNuevo =
          nuevoPrecio > 0
            ? (nuevoPrecio - repuesto.costoPromedioArs) / nuevoPrecio
            : null;

        // Actualizar precio
        await tx.repuesto.update({
          where: { id: repuesto.id },
          data: { precioVenta: nuevoPrecio },
        });

        // Crear registro en historial
        await tx.historialPrecioRepuesto.create({
          data: {
            repuestoId: repuesto.id,
            precioAnterior: repuesto.precioVenta,
            precioNuevo: nuevoPrecio,
            tipoCambio: "BULK_UPDATE",
            motivo:
              motivo ||
              `Cambio masivo: ${tipo === "PORCENTAJE" ? `${valor}%` : tipo === "PRECIO_FIJO" ? `precio fijo $${valor}` : "regla de margen"}`,
            costoAlMomento: repuesto.costoPromedioArs,
            margenAlMomento: margenNuevo,
            loteId,
            usuario: session.user.email || session.user.name || "Usuario",
          },
        });

        cambiosRealizados.push({
          repuestoId: repuesto.id,
          nombre: repuesto.nombre,
          codigo: repuesto.codigo,
          precioAnterior: repuesto.precioVenta,
          precioNuevo: nuevoPrecio,
        });
      }

      return cambiosRealizados;
    });

    return NextResponse.json({
      success: true,
      loteId,
      totalCambios: cambios.length,
      cambios,
    });
  } catch (err: unknown) {
    console.error("Error en cambio masivo:", err);
    return NextResponse.json(
      { error: "Error al realizar cambio masivo" },
      { status: 500 }
    );
  }
}
