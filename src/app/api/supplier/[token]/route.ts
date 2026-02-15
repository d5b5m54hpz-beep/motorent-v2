import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Buscar token (público, sin auth)
    const portalToken = await prisma.portalProveedorToken.findUnique({
      where: { token },
      include: {
        embarque: {
          include: {
            proveedor: {
              select: {
                nombre: true,
                contacto: true,
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

    // Registrar visita
    if (!portalToken.vistoAt) {
      const userAgent = req.headers.get("user-agent") || undefined;
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

      await prisma.portalProveedorToken.update({
        where: { id: portalToken.id },
        data: {
          vistoAt: new Date(),
          vistoPor: `${ip} | ${userAgent}`,
        },
      });
    }

    // Retornar datos del embarque
    return NextResponse.json({
      embarque: {
        referencia: portalToken.embarque.referencia,
        proveedor: portalToken.embarque.proveedor?.nombre || "N/A",
        fechaSalida: portalToken.embarque.fechaSalida,
        fechaLlegadaEstimada: portalToken.embarque.fechaLlegadaEstimada,
        numeroContenedor: portalToken.embarque.numeroContenedor,
        items: portalToken.embarque.items.map((item) => ({
          id: item.id,
          codigo: item.repuesto?.codigo || "N/A",
          nombre: item.repuesto?.nombre || "Item sin nombre",
          descripcion: item.repuesto?.descripcion,
          cantidad: item.cantidad,
          pesoTotalKg: item.pesoTotalKg,
          volumenTotalCbm: item.volumenTotalCbm,
        })),
      },
      confirmado: portalToken.confirmado,
      confirmadoAt: portalToken.confirmadoAt,
    });
  } catch (error: unknown) {
    console.error("Error fetching supplier portal:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
