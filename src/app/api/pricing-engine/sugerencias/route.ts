import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";

type Sugerencia = {
  tipo: "CRITICO" | "ADVERTENCIA" | "ALERTA_TC" | "PENDIENTE" | "REVISAR" | "INFO";
  modeloMoto?: string;
  planCodigo?: string;
  mensaje: string;
  margenActual?: number;
  margenObjetivo?: number;
  accion?: string;
};

const PRIORIDAD: Record<Sugerencia["tipo"], number> = {
  CRITICO: 1,
  ADVERTENCIA: 2,
  ALERTA_TC: 3,
  PENDIENTE: 4,
  REVISAR: 5,
  INFO: 6,
};

export async function GET() {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const [config, precios, planes] = await Promise.all([
      prisma.costoOperativoConfig.findUnique({ where: { id: "default" } }),
      prisma.precioModeloAlquiler.findMany({
        where: { activo: true },
        include: { plan: true },
      }),
      prisma.planAlquiler.findMany({ where: { activo: true } }),
    ]);

    const sugerencias: Sugerencia[] = [];

    // Regla 4: ALERTA_TC — TC desactualizado
    if (!config?.tipoCambioUpdatedAt) {
      sugerencias.push({ tipo: "ALERTA_TC", mensaje: "Tipo de cambio nunca actualizado. Actualizá el TC para calcular precios precisos.", accion: "Actualizar TC" });
    } else {
      const diasSin = Math.floor((Date.now() - config.tipoCambioUpdatedAt.getTime()) / 86400000);
      if (diasSin > 7) {
        sugerencias.push({ tipo: "ALERTA_TC", mensaje: `Tipo de cambio sin actualizar hace ${diasSin} días. Revisá si el TC USD es correcto.`, accion: "Actualizar TC" });
      }
    }

    // Agrupar precios por modelo para detección de PENDIENTE
    const modelosConPrecios = new Map<string, Set<string>>();
    for (const p of precios) {
      if (!modelosConPrecios.has(p.modeloMoto)) {
        modelosConPrecios.set(p.modeloMoto, new Set());
      }
      modelosConPrecios.get(p.modeloMoto)!.add(p.plan.codigo);
    }

    // Regla 5: PENDIENTE — modelo sin precio para algún plan
    const planCodigos = new Set(planes.map((p) => p.codigo));
    for (const [modelo, codigos] of modelosConPrecios.entries()) {
      for (const cod of planCodigos) {
        if (!codigos.has(cod)) {
          sugerencias.push({
            tipo: "PENDIENTE",
            modeloMoto: modelo,
            planCodigo: cod,
            mensaje: `${modelo} no tiene precio configurado para el plan ${cod}.`,
            accion: "Calcular precio",
          });
        }
      }
    }

    for (const precio of precios) {
      const margenPct = Number(precio.margenPct);
      const margenObjetivo = Number(precio.margenObjetivoPct);

      // Regla 1: CRITICO — margen < 10%
      if (margenPct < 10) {
        sugerencias.push({
          tipo: "CRITICO",
          modeloMoto: precio.modeloMoto,
          planCodigo: precio.plan.codigo,
          margenActual: margenPct,
          margenObjetivo,
          mensaje: `CRÍTICO: ${precio.modeloMoto} / ${precio.plan.nombre} tiene margen del ${margenPct.toFixed(1)}% (< 10%).`,
          accion: "Recalcular precio",
        });
      }
      // Regla 2: ADVERTENCIA — margen < objetivo pero >= 10%
      else if (margenPct < margenObjetivo) {
        sugerencias.push({
          tipo: "ADVERTENCIA",
          modeloMoto: precio.modeloMoto,
          planCodigo: precio.plan.codigo,
          margenActual: margenPct,
          margenObjetivo,
          mensaje: `${precio.modeloMoto} / ${precio.plan.nombre}: margen ${margenPct.toFixed(1)}% por debajo del objetivo ${margenObjetivo}%.`,
          accion: "Revisar precio",
        });
      }
      // Regla 3: INFO — margen > 50%
      else if (margenPct > 50) {
        sugerencias.push({
          tipo: "INFO",
          modeloMoto: precio.modeloMoto,
          planCodigo: precio.plan.codigo,
          margenActual: margenPct,
          margenObjetivo,
          mensaje: `${precio.modeloMoto} / ${precio.plan.nombre}: margen muy alto ${margenPct.toFixed(1)}%. Oportunidad de ser más competitivo.`,
        });
      }

      // Regla 6: REVISAR — precioManual difiere > 20% del calculado
      if (precio.precioManual !== null && precio.precioManual !== undefined) {
        const calculado = Number(precio.precioConDescuento);
        const manual = Number(precio.precioManual);
        if (calculado > 0) {
          const diferenciaPct = Math.abs((manual - calculado) / calculado) * 100;
          if (diferenciaPct > 20) {
            sugerencias.push({
              tipo: "REVISAR",
              modeloMoto: precio.modeloMoto,
              planCodigo: precio.plan.codigo,
              mensaje: `${precio.modeloMoto} / ${precio.plan.nombre}: precio manual difiere ${diferenciaPct.toFixed(0)}% del calculado. Motivo: ${precio.motivoOverride ?? "sin especificar"}.`,
              accion: "Revisar override",
            });
          }
        }
      }
    }

    // Sort by priority
    sugerencias.sort((a, b) => PRIORIDAD[a.tipo] - PRIORIDAD[b.tipo]);

    return NextResponse.json({
      total: sugerencias.length,
      criticos: sugerencias.filter((s) => s.tipo === "CRITICO").length,
      sugerencias,
    });
  } catch (err: unknown) {
    console.error("[pricing-engine/sugerencias GET]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
