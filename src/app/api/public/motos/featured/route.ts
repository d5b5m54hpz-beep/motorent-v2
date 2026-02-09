import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get 4 most recent available motos for landing page
    const featured = await prisma.moto.findMany({
      where: {
        estado: "disponible",
      },
      take: 4,
      orderBy: { createdAt: "desc" },
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
      },
    });

    return NextResponse.json(featured);
  } catch (error: unknown) {
    console.error("Error fetching featured motos:", error);
    return NextResponse.json(
      { error: "Error al cargar motos destacadas" },
      { status: 500 }
    );
  }
}
