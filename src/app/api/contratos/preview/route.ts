import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { calcularPreciosContrato } from "@/lib/contratos";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.rental.contract.view,
    "view",
    ["OPERADOR"]
  );
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
      {
        precioBaseMensual: Number(pricingConfig.precioBaseMensual),
        descuentoSemanal: Number(pricingConfig.descuentoSemanal),
        descuentoMeses3: Number(pricingConfig.descuentoMeses3),
        descuentoMeses6: Number(pricingConfig.descuentoMeses6),
        descuentoMeses9: Number(pricingConfig.descuentoMeses9),
        descuentoMeses12: Number(pricingConfig.descuentoMeses12),
      }
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
