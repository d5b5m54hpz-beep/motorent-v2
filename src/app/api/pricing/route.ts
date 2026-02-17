import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { pricingSchema } from "@/lib/validations";

/**
 * GET /api/pricing
 * Obtener configuración de precios activa
 * Accesible para ADMIN y OPERADOR
 */
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.rental.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    // Obtener el pricing config activo (debería ser único con id "default")
    let pricingConfig = await prisma.pricingConfig.findUnique({
      where: { id: "default" },
    });

    // Si no existe, crear uno por defecto
    if (!pricingConfig) {
      pricingConfig = await prisma.pricingConfig.create({
        data: {
          id: "default",
          precioBaseMensual: 50000,
          descuentoSemanal: 0,
          descuentoMeses3: 5,
          descuentoMeses6: 10,
          descuentoMeses9: 15,
          descuentoMeses12: 20,
        },
      });
    }

    return NextResponse.json(pricingConfig);
  } catch (error: unknown) {
    console.error("Error in GET /api/pricing:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/pricing
 * Actualizar configuración de precios
 * Solo accesible para ADMIN
 */
export async function PUT(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.rental.update, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = pricingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { precioBaseMensual, descuentoSemanal, descuentoMeses3, descuentoMeses6, descuentoMeses9, descuentoMeses12 } = parsed.data;

    // Actualizar o crear el pricing config
    const pricingConfig = await prisma.pricingConfig.upsert({
      where: { id: "default" },
      update: {
        precioBaseMensual,
        descuentoSemanal,
        descuentoMeses3,
        descuentoMeses6,
        descuentoMeses9,
        descuentoMeses12,
      },
      create: {
        id: "default",
        precioBaseMensual,
        descuentoSemanal,
        descuentoMeses3,
        descuentoMeses6,
        descuentoMeses9,
        descuentoMeses12,
      },
    });

    eventBus.emit(OPERATIONS.pricing.rental.update, "PricingConfig", "default", { precioBaseMensual, descuentoSemanal, descuentoMeses3, descuentoMeses6, descuentoMeses9, descuentoMeses12 }, userId).catch(err => console.error("Error emitting pricing.rental.update event:", err));

    return NextResponse.json(pricingConfig);
  } catch (error: unknown) {
    console.error("Error in PUT /api/pricing:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
