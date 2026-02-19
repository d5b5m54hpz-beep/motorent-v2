import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const planSchema = z.object({
  nombre: z.string().min(1),
  codigo: z.string().min(1),
  descripcion: z.string().optional(),
  duracionMeses: z.number().int().positive(),
  esRentToOwn: z.boolean().optional().default(false),
  descuentoPct: z.number().min(0).max(100).optional().default(0),
  depositoMeses: z.number().min(0).optional().default(1),
  depositoConDescuento: z.boolean().optional().default(false),
  permiteSemanal: z.boolean().optional().default(true),
  permiteQuincenal: z.boolean().optional().default(true),
  permiteMensual: z.boolean().optional().default(true),
  recargoSemanalPct: z.number().min(0).optional().default(10),
  recargoQuincenalPct: z.number().min(0).optional().default(5),
  recargoEfectivoPct: z.number().min(0).optional().default(5),
  recargoMercadoPagoPct: z.number().min(0).optional().default(0),
  activo: z.boolean().optional().default(true),
  orden: z.number().int().optional().default(0),
  destacado: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const all = url.searchParams.get("all") === "true";

    const planes = await prisma.planAlquiler.findMany({
      where: all ? undefined : { activo: true },
      orderBy: { orden: "asc" },
      include: { _count: { select: { preciosPorModelo: true, contratos: true } } },
    });

    return NextResponse.json(planes);
  } catch (err: unknown) {
    console.error("[pricing-engine/planes GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.planAlquiler.findUnique({ where: { codigo: parsed.data.codigo } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un plan con ese código" }, { status: 409 });
    }

    const plan = await prisma.planAlquiler.create({ data: parsed.data });
    return NextResponse.json(plan, { status: 201 });
  } catch (err: unknown) {
    console.error("[pricing-engine/planes POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
