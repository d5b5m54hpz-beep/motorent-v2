import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const configSchema = z.object({
  seguroRC: z.number().min(0).optional(),
  seguroRoboIncendio: z.number().min(0).optional(),
  seguroTotal: z.number().min(0).optional(),
  patenteAnual: z.number().min(0).optional(),
  vtvAnual: z.number().min(0).optional(),
  otrosImpuestosAnuales: z.number().min(0).optional(),
  costoIoTMensual: z.number().min(0).optional(),
  mantenimientoManoObra: z.number().min(0).optional(),
  mantenimientoRepuestos: z.number().min(0).optional(),
  mantenimientoTotal: z.number().min(0).optional(),
  reservaContingenciaPct: z.number().min(0).max(100).optional(),
  costoMotoParadaDiario: z.number().min(0).optional(),
  diasParadaEstimadoMes: z.number().min(0).optional(),
  comisionCobranzaPct: z.number().min(0).max(100).optional(),
  costoAdminPorMoto: z.number().min(0).optional(),
  morosidadEstimadaPct: z.number().min(0).max(100).optional(),
  costoAlmacenamientoPorMoto: z.number().min(0).optional(),
  tasaInflacionMensualEst: z.number().min(0).optional(),
  costoCapitalAnualPct: z.number().min(0).max(100).optional(),
  tipoCambioUSD: z.number().min(0).optional(),
  tipoCambioFuente: z.string().optional(),
  notas: z.string().optional(),
});

export async function GET() {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const config = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (err: unknown) {
    console.error("[pricing-engine/config GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Auto-calc seguroTotal if components provided
    if (data.seguroRC !== undefined || data.seguroRoboIncendio !== undefined) {
      const existing = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
      const rc = data.seguroRC ?? Number(existing?.seguroRC ?? 0);
      const robo = data.seguroRoboIncendio ?? Number(existing?.seguroRoboIncendio ?? 0);
      if (data.seguroTotal === undefined) {
        data.seguroTotal = rc + robo;
      }
    }

    // Auto-calc mantenimientoTotal if components provided
    if (data.mantenimientoManoObra !== undefined || data.mantenimientoRepuestos !== undefined) {
      const existing = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
      const mo = data.mantenimientoManoObra ?? Number(existing?.mantenimientoManoObra ?? 0);
      const rep = data.mantenimientoRepuestos ?? Number(existing?.mantenimientoRepuestos ?? 0);
      if (data.mantenimientoTotal === undefined) {
        data.mantenimientoTotal = mo + rep;
      }
    }

    const config = await prisma.costoOperativoConfig.upsert({
      where: { id: "default" },
      update: { ...data, updatedAt: new Date() },
      create: { id: "default", ...data },
    });

    return NextResponse.json(config);
  } catch (err: unknown) {
    console.error("[pricing-engine/config PUT]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
