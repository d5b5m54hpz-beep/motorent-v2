import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Buscar token
    const portalToken = await prisma.portalProveedorToken.findUnique({
      where: { token },
      include: {
        embarque: {
          include: {
            proveedor: {
              select: {
                nombre: true,
              },
            },
            items: {
              include: {
                repuesto: {
                  select: {
                    codigo: true,
                    nombre: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!portalToken || !portalToken.activo) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 404 }
      );
    }

    // TODO: Implementar generación de PDF con jsPDF
    // Por ahora, retornamos la data JSON para que el frontend pueda generar el PDF
    return NextResponse.json({
      embarque: {
        referencia: portalToken.embarque.referencia,
        proveedor: portalToken.embarque.proveedor?.nombre || "N/A",
        items: portalToken.embarque.items.map((item) => ({
          id: item.id,
          codigo: item.repuesto?.codigo || "N/A",
          nombre: item.repuesto?.nombre || "Item sin nombre",
          cantidad: item.cantidad,
          qrUrl: `${process.env.NEXTAUTH_URL || "https://motolibre.com"}/scan/${item.id}`,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Error generando etiquetas:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
