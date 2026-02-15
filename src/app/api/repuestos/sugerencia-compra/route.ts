import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener todos los repuestos con stock bajo o crítico
    const repuestos = await prisma.repuesto.findMany({
      where: {
        activo: true,
      },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Calcular unidades en tránsito para cada repuesto
    const repuestoIds = repuestos.map((r) => r.id);
    const embarquesActivos = await prisma.itemEmbarque.findMany({
      where: {
        repuestoId: { in: repuestoIds },
        embarque: {
          estado: {
            in: ["EN_TRANSITO", "EN_PUERTO", "EN_ADUANA", "DESPACHADO_PARCIAL", "EN_RECEPCION"],
          },
        },
      },
      select: {
        repuestoId: true,
        cantidad: true,
      },
    });

    // Agrupar por repuestoId
    const transitoMap = new Map<string, number>();
    for (const item of embarquesActivos) {
      if (!item.repuestoId) continue;
      const existing = transitoMap.get(item.repuestoId) || 0;
      transitoMap.set(item.repuestoId, existing + item.cantidad);
    }

    // Calcular sugerencias
    const sugerencias = repuestos
      .map((r) => {
        const enTransito = transitoMap.get(r.id) || 0;
        const stockEfectivo = r.stock + enTransito;
        const necesita = stockEfectivo <= r.stockMinimo;

        if (!necesita) return null;

        // Sugerencia: comprar el doble del mínimo menos el stock efectivo
        const cantidadSugerida = Math.max(0, r.stockMinimo * 2 - stockEfectivo);

        return {
          id: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          stock: r.stock,
          stockMinimo: r.stockMinimo,
          enTransito,
          stockEfectivo,
          cantidadSugerida,
          proveedorId: r.proveedorId,
          proveedorNombre: r.proveedor?.nombre || "Sin proveedor",
          precioCompra: r.precioCompra,
        };
      })
      .filter((s) => s !== null && s.cantidadSugerida > 0);

    // Agrupar por proveedor
    const porProveedor = sugerencias.reduce(
      (acc, item) => {
        if (!item) return acc;
        const key = item.proveedorId || "SIN_PROVEEDOR";
        if (!acc[key]) {
          acc[key] = {
            proveedorId: item.proveedorId,
            proveedorNombre: item.proveedorNombre,
            items: [],
          };
        }
        acc[key].items.push(item);
        return acc;
      },
      {} as Record<string, { proveedorId: string | null; proveedorNombre: string; items: typeof sugerencias }>
    );

    return NextResponse.json({
      sugerencias,
      porProveedor: Object.values(porProveedor),
      totalItems: sugerencias.length,
      totalUnidades: sugerencias.reduce((sum, s) => sum + (s?.cantidadSugerida || 0), 0),
    });
  } catch (error: unknown) {
    console.error("Error generando sugerencia de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
