import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const moto = await prisma.moto.findUnique({
      where: { id },
      select: {
        id: true,
        marca: true,
        modelo: true,
        anio: true,
        color: true,
        precioMensual: true,
        cilindrada: true,
        tipo: true,
        descripcion: true,
        imagen: true,
        kilometraje: true,
        estado: true,
        patente: true, // Show partial patente for display
      },
    });

    if (!moto) {
      return NextResponse.json(
        { error: "Moto no encontrada" },
        { status: 404 }
      );
    }

    // Only return if moto is available
    if (moto.estado !== "DISPONIBLE") {
      return NextResponse.json(
        { error: "Moto no disponible" },
        { status: 404 }
      );
    }

    return NextResponse.json(moto);
  } catch (error: unknown) {
    console.error("Error fetching public moto:", error);
    return NextResponse.json(
      { error: "Error al cargar moto" },
      { status: 500 }
    );
  }
}
