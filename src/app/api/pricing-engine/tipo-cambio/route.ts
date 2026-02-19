import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const tcSchema = z.object({
  tipoCambioUSD: z.number().positive().optional(),
  fuente: z.enum(["MANUAL", "BLUELYTICS"]).optional().default("MANUAL"),
});

export async function GET() {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const config = await prisma.costoOperativoConfig.findUnique({
      where: { id: "default" },
      select: { tipoCambioUSD: true, tipoCambioFuente: true, tipoCambioUpdatedAt: true },
    });
    if (!config) return NextResponse.json({ error: "Config no encontrada" }, { status: 404 });

    const diasSinActualizar = config.tipoCambioUpdatedAt
      ? Math.floor((Date.now() - config.tipoCambioUpdatedAt.getTime()) / 86400000)
      : null;

    return NextResponse.json({
      tipoCambioUSD: Number(config.tipoCambioUSD),
      fuente: config.tipoCambioFuente,
      updatedAt: config.tipoCambioUpdatedAt,
      diasSinActualizar,
      desactualizado: diasSinActualizar === null || diasSinActualizar > 7,
    });
  } catch (err: unknown) {
    console.error("[pricing-engine/tipo-cambio GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.update", "execute");
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = tcSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let tipoCambioUSD = parsed.data.tipoCambioUSD;
    let fuente = parsed.data.fuente ?? "MANUAL";

    // Fetch from Bluelytics if requested
    if (fuente === "BLUELYTICS") {
      try {
        const res = await fetch("https://api.bluelytics.com.ar/v2/latest", {
          next: { revalidate: 0 },
        });
        if (res.ok) {
          const data = await res.json();
          // Use blue dollar average
          const blueVenta = data?.blue?.value_sell ?? 0;
          const blueCompra = data?.blue?.value_buy ?? 0;
          if (blueVenta > 0 && blueCompra > 0) {
            tipoCambioUSD = (blueVenta + blueCompra) / 2;
          }
        }
      } catch (fetchErr) {
        console.warn("[tipo-cambio] Bluelytics fetch failed:", fetchErr);
        // Fallback to manual if provided
        if (!tipoCambioUSD) {
          return NextResponse.json({ error: "No se pudo obtener TC de Bluelytics y no hay valor manual" }, { status: 502 });
        }
        fuente = "MANUAL";
      }
    }

    if (!tipoCambioUSD || tipoCambioUSD <= 0) {
      return NextResponse.json({ error: "Tipo de cambio inválido" }, { status: 400 });
    }

    // Calculate impact on existing prices
    const config = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
    const tcAnterior = Number(config?.tipoCambioUSD ?? 0);
    const variacionPct = tcAnterior > 0 ? ((tipoCambioUSD - tcAnterior) / tcAnterior) * 100 : 0;

    const updated = await prisma.costoOperativoConfig.update({
      where: { id: "default" },
      data: {
        tipoCambioUSD,
        tipoCambioFuente: fuente,
        tipoCambioUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({
      tipoCambioUSD: Number(updated.tipoCambioUSD),
      fuente: updated.tipoCambioFuente,
      updatedAt: updated.tipoCambioUpdatedAt,
      variacionPct: Math.round(variacionPct * 100) / 100,
      tcAnterior,
    });
  } catch (err: unknown) {
    console.error("[pricing-engine/tipo-cambio POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
