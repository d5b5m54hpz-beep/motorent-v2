import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  duracionMeses: z.number().int().positive().optional(),
  esRentToOwn: z.boolean().optional(),
  descuentoPct: z.number().min(0).max(100).optional(),
  depositoMeses: z.number().min(0).optional(),
  depositoConDescuento: z.boolean().optional(),
  permiteSemanal: z.boolean().optional(),
  permiteQuincenal: z.boolean().optional(),
  permiteMensual: z.boolean().optional(),
  recargoSemanalPct: z.number().min(0).optional(),
  recargoQuincenalPct: z.number().min(0).optional(),
  recargoEfectivoPct: z.number().min(0).optional(),
  recargoMercadoPagoPct: z.number().min(0).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().optional(),
  destacado: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    const plan = await prisma.planAlquiler.findUnique({
      where: { id },
      include: { preciosPorModelo: { orderBy: { modeloMoto: "asc" } } },
    });
    if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    return NextResponse.json(plan);
  } catch (err: unknown) {
    console.error("[pricing-engine/planes/[id] GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const plan = await prisma.planAlquiler.update({ where: { id }, data: parsed.data });
    return NextResponse.json(plan);
  } catch (err: unknown) {
    console.error("[pricing-engine/planes/[id] PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const { id } = await params;
    // Soft delete
    const plan = await prisma.planAlquiler.update({ where: { id }, data: { activo: false } });
    return NextResponse.json(plan);
  } catch (err: unknown) {
    console.error("[pricing-engine/planes/[id] DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
