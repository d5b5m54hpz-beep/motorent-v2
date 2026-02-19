import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const precioSchema = z.object({
  modeloMoto: z.string().min(1),
  marcaMoto: z.string().optional(),
  planId: z.string().min(1),
  costoLandedUSD: z.number().min(0).optional(),
  costoLandedARS: z.number().min(0).optional(),
  amortizacionMensual: z.number().min(0).optional(),
  costoOperativoMensual: z.number().min(0).optional(),
  costoTotalMensual: z.number().min(0).optional(),
  precioBaseMensual: z.number().min(0),
  precioConDescuento: z.number().min(0),
  margenMensual: z.number().optional(),
  margenPct: z.number().optional(),
  margenObjetivoPct: z.number().min(0).max(100).optional(),
  precioManual: z.number().min(0).optional().nullable(),
  motivoOverride: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

const bulkUpdateSchema = z.object({
  precios: z.array(
    z.object({
      id: z.string(),
      precioManual: z.number().min(0).optional().nullable(),
      motivoOverride: z.string().optional().nullable(),
      activo: z.boolean().optional(),
      margenObjetivoPct: z.number().min(0).max(100).optional(),
    })
  ),
});

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const modelo = url.searchParams.get("modelo");
    const planCodigo = url.searchParams.get("plan");
    const soloActivos = url.searchParams.get("activo") !== "false";

    const precios = await prisma.precioModeloAlquiler.findMany({
      where: {
        ...(modelo ? { modeloMoto: { contains: modelo, mode: "insensitive" } } : {}),
        ...(planCodigo ? { plan: { codigo: planCodigo } } : {}),
        ...(soloActivos ? { activo: true } : {}),
      },
      include: { plan: true },
      orderBy: [{ modeloMoto: "asc" }, { plan: { orden: "asc" } }],
    });

    return NextResponse.json(precios);
  } catch (err: unknown) {
    console.error("[pricing-engine/precios GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = precioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const config = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
    const tipoCambio = Number(config?.tipoCambioUSD ?? 0);

    // Check if exists for historial
    const existing = await prisma.precioModeloAlquiler.findUnique({
      where: { modeloMoto_planId: { modeloMoto: data.modeloMoto, planId: data.planId } },
      include: { plan: true },
    });

    const precio = await prisma.precioModeloAlquiler.upsert({
      where: { modeloMoto_planId: { modeloMoto: data.modeloMoto, planId: data.planId } },
      update: data,
      create: data,
      include: { plan: true },
    });

    // Historial
    const precioAnterior = existing?.precioConDescuento ?? existing?.precioBaseMensual ?? 0;
    const precioNuevo = data.precioConDescuento;
    if (Number(precioAnterior) !== precioNuevo) {
      await prisma.historialPrecioAlquiler.create({
        data: {
          precioModeloId: precio.id,
          modeloMoto: data.modeloMoto,
          planCodigo: precio.plan.codigo,
          precioAnterior: Number(precioAnterior),
          precioNuevo,
          costoLandedARS: data.costoLandedARS ?? 0,
          tipoCambio,
          margenPct: data.margenPct ?? 0,
          motivo: data.motivoOverride ?? "Upsert desde API",
          creadoPor: userId,
        },
      });
    }

    return NextResponse.json(precio, { status: 201 });
  } catch (err: unknown) {
    console.error("[pricing-engine/precios POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, userId } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = bulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const config = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
    const tipoCambio = Number(config?.tipoCambioUSD ?? 0);

    const updated = [];
    for (const item of parsed.data.precios) {
      const existing = await prisma.precioModeloAlquiler.findUnique({
        where: { id: item.id },
        include: { plan: true },
      });
      if (!existing) continue;

      const precio = await prisma.precioModeloAlquiler.update({
        where: { id: item.id },
        data: {
          ...(item.precioManual !== undefined ? { precioManual: item.precioManual } : {}),
          ...(item.motivoOverride !== undefined ? { motivoOverride: item.motivoOverride } : {}),
          ...(item.activo !== undefined ? { activo: item.activo } : {}),
          ...(item.margenObjetivoPct !== undefined ? { margenObjetivoPct: item.margenObjetivoPct } : {}),
        },
      });

      if (item.precioManual !== undefined && item.precioManual !== null) {
        const precioAnterior = Number(existing.precioConDescuento);
        if (precioAnterior !== item.precioManual) {
          await prisma.historialPrecioAlquiler.create({
            data: {
              precioModeloId: item.id,
              modeloMoto: existing.modeloMoto,
              planCodigo: existing.plan.codigo,
              precioAnterior,
              precioNuevo: item.precioManual,
              costoLandedARS: Number(existing.costoLandedARS),
              tipoCambio,
              margenPct: Number(existing.margenPct),
              motivo: item.motivoOverride ?? "Override manual bulk",
              creadoPor: userId,
            },
          });
        }
      }

      updated.push(precio);
    }

    return NextResponse.json({ updated: updated.length, precios: updated });
  } catch (err: unknown) {
    console.error("[pricing-engine/precios PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
