import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET() {
  const { error } = await requirePermission(OPERATIONS.pricing.rental.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    // Get the default pricing config (there should only be one)
    const config = await prisma.pricingConfig.findUnique({
      where: { id: "default" },
    });

    // If no config exists, create one with default values
    if (!config) {
      const newConfig = await prisma.pricingConfig.create({
        data: {
          id: "default",
          precioBaseMensual: 150000,
          descuentoSemanal: 10,
          descuentoMeses3: 5,
          descuentoMeses6: 10,
          descuentoMeses9: 15,
          descuentoMeses12: 20,
        },
      });
      return NextResponse.json(newConfig);
    }

    return NextResponse.json(config);
  } catch (err: unknown) {
    console.error("Error fetching pricing config:", err);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        precioBaseMensual: 150000,
        descuentoSemanal: 10,
        descuentoMeses3: 5,
        descuentoMeses6: 10,
        descuentoMeses9: 15,
        descuentoMeses12: 20,
      },
      { status: 500 }
    );
  }
}
