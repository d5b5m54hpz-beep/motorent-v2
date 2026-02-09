import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const pricing = await prisma.pricingConfig.findUnique({
      where: { id: "default" },
      select: {
        precioBaseMensual: true,
        descuentoSemanal: true,
        descuentoMeses3: true,
        descuentoMeses6: true,
        descuentoMeses9: true,
        descuentoMeses12: true,
      },
    });

    if (!pricing) {
      return NextResponse.json(
        { error: "Configuración de precios no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(pricing);
  } catch (error: unknown) {
    console.error("Error fetching pricing config:", error);
    return NextResponse.json(
      { error: "Error al cargar configuración de precios" },
      { status: 500 }
    );
  }
}
