import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error: authError, userId } = await requirePermission(OPERATIONS.system.scan.view, "view", ["OPERADOR"]);
    const autenticado = !authError;

    // Buscar en etiquetas de embarque
    const etiqueta = await prisma.etiquetaEmbarque.findUnique({
      where: { codigoQr: id },
      include: {
        embarque: {
          select: {
            referencia: true,
            estado: true,
            proveedor: {
              select: {
                nombre: true,
              },
            },
          },
        },
        item: {
          select: {
            repuesto: {
              select: {
                codigo: true,
                nombre: true,
                descripcion: true,
                stock: true,
                ubicacion: true,
              },
            },
          },
        },
      },
    });

    if (etiqueta) {
      return NextResponse.json({
        tipo: "ETIQUETA",
        repuesto: etiqueta.item?.repuesto,
        embarque: {
          referencia: etiqueta.embarque.referencia,
          estado: etiqueta.embarque.estado,
          proveedor: etiqueta.embarque.proveedor?.nombre || "N/A",
        },
        autenticado,
        detalles: autenticado ? etiqueta.datos : null,
      });
    }

    // Buscar como código de repuesto
    const repuesto = await prisma.repuesto.findFirst({
      where: {
        OR: [
          { codigo: id },
          { codigoBarras: id },
        ],
      },
      select: {
        codigo: true,
        nombre: true,
        descripcion: true,
        stock: true,
        ubicacion: true,
      },
    });

    if (repuesto) {
      return NextResponse.json({
        tipo: "REPUESTO",
        repuesto: autenticado ? repuesto : {
          codigo: repuesto.codigo,
          nombre: repuesto.nombre,
          descripcion: repuesto.descripcion,
          stock: null,
          ubicacion: null,
        },
        autenticado,
      });
    }

    return NextResponse.json(
      { error: "Código no encontrado" },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error("Error processing scan:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
