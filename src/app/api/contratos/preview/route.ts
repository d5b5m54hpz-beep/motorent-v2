import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { calcularPreciosContrato } from "@/lib/contratos";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { precioBaseMensual, fechaInicio, fechaFin, frecuenciaPago } = await req.json();

    const pricingConfig = await prisma.pricingConfig.findUnique({
      where: { id: "default" },
    });

    if (!pricingConfig) {
      return NextResponse.json(
        { error: "Configuracion de precios no encontrada" },
        { status: 500 }
      );
    }

    const calculo = calcularPreciosContrato(
      precioBaseMensual,
      new Date(fechaInicio),
      new Date(fechaFin),
      frecuenciaPago,
      pricingConfig
    );

    return NextResponse.json(calculo);
  } catch (error: unknown) {
    console.error("Error calculating preview:", error);
    return NextResponse.json(
      { error: "Error al calcular preview" },
      { status: 500 }
    );
  }
}
