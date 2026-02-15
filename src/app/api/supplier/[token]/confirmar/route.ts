import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
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
          select: {
            id: true,
            referencia: true,
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

    // Marcar como confirmado
    await prisma.portalProveedorToken.update({
      where: { id: portalToken.id },
      data: {
        confirmado: true,
        confirmadoAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Shipment confirmed successfully",
      embarqueRef: portalToken.embarque.referencia,
    });
  } catch (error: unknown) {
    console.error("Error confirming shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
