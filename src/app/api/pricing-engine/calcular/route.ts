import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const calcularSchema = z.object({
  modeloMoto: z.string().min(1),
  costoLandedUSD: z.number().min(0).optional(),
  costoLandedARS: z.number().min(0).optional(),
  margenObjetivoPct: z.number().min(0).max(100).optional().default(25),
});

export type CalcResultPlan = {
  planId: string;
  planCodigo: string;
  planNombre: string;
  esRentToOwn: boolean;
  duracionMeses: number;
  costos: {
    amortizacionMensual: number;
    costoOperativoMensual: number;
    costoTotalMensual: number;
  };
  precios: {
    mensual: { base: number; conDescuento: number; deposito: number };
    quincenal: { base: number; conDescuento: number; deposito: number };
    semanal: { base: number; conDescuento: number; deposito: number };
    formasPago: {
      transferencia: number;
      mercadopago: number;
      efectivo: number;
    };
  };
  margen: {
    pct: number;
    monto: number;
    estado: "OK" | "BAJO" | "CRITICO";
    objetivo: number;
  };
  rentToOwn?: {
    costoTotal24Meses: number;
    diferenciaVsLanded: number;
    teaImplicita: number;
  };
};

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = calcularSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { modeloMoto, costoLandedUSD, costoLandedARS: costoLandedARSInput, margenObjetivoPct } = parsed.data;

    // Load config
    const config = await prisma.costoOperativoConfig.findUnique({ where: { id: "default" } });
    if (!config) {
      return NextResponse.json({ error: "Config no encontrada. Ejecutar seed." }, { status: 404 });
    }

    // Resolve costoLandedARS
    const tc = Number(config.tipoCambioUSD);
    let costoLandedARS = costoLandedARSInput ?? 0;
    if (!costoLandedARS && costoLandedUSD && tc > 0) {
      costoLandedARS = costoLandedUSD * tc;
    }

    // Load active plans
    const planes = await prisma.planAlquiler.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
    });

    const margenObj = margenObjetivoPct ?? 25;

    // Costos operativos comunes (no dependen del plan)
    const seguro = Number(config.seguroTotal);
    const impuestosMensual = (Number(config.patenteAnual) + Number(config.vtvAnual) + Number(config.otrosImpuestosAnuales)) / 12;
    const iot = Number(config.costoIoTMensual);
    const mto = Number(config.mantenimientoTotal);
    const almac = Number(config.costoAlmacenamientoPorMoto);
    const admin = Number(config.costoAdminPorMoto);
    const reservaPct = Number(config.reservaContingenciaPct);

    const reservaMensual = costoLandedARS > 0 ? (costoLandedARS * reservaPct / 100) / 12 : 0;
    const costoOperativoMensual = seguro + impuestosMensual + iot + mto + reservaMensual + almac + admin;

    const resultados: CalcResultPlan[] = planes.map((plan) => {
      // PASO 1 — Amortización
      let amortizacionMensual = 0;
      if (costoLandedARS > 0) {
        if (plan.esRentToOwn) {
          amortizacionMensual = costoLandedARS / plan.duracionMeses;
        } else {
          amortizacionMensual = (costoLandedARS * 0.85) / 48;
        }
      }

      // PASO 3 — Costo total mensual
      const costoTotalMensual = amortizacionMensual + costoOperativoMensual;

      // PASO 4 — Precio base (margen sobre precio)
      const margenFactor = margenObj > 0 ? 1 - margenObj / 100 : 1;
      const precioBaseMensual = margenFactor > 0 ? costoTotalMensual / margenFactor : costoTotalMensual * 1.25;

      // PASO 5 — Con descuento del plan
      const descPct = Number(plan.descuentoPct);
      const precioConDescuento = precioBaseMensual * (1 - descPct / 100);

      // PASO 6 — Por frecuencia
      const recQuincenalPct = Number(plan.recargoQuincenalPct);
      const recSemanalPct = Number(plan.recargoSemanalPct);
      const precioQuincenal = (precioConDescuento / 2) * (1 + recQuincenalPct / 100);
      const precioSemanal = (precioConDescuento / 4) * (1 + recSemanalPct / 100);

      // PASO 7 — Por forma de pago (sobre precio mensual)
      const recMPPct = Number(plan.recargoMercadoPagoPct);
      const recEfectivoPct = Number(plan.recargoEfectivoPct);
      const formasPago = {
        transferencia: precioConDescuento,
        mercadopago: precioConDescuento * (1 + recMPPct / 100),
        efectivo: precioConDescuento * (1 + recEfectivoPct / 100),
      };

      // PASO 8 — Depósito
      const depMeses = Number(plan.depositoMeses);
      const baseDeposito = plan.depositoConDescuento ? precioConDescuento : precioBaseMensual;
      const deposito = baseDeposito * depMeses;

      // PASO 9 — Margen real
      const margenMonto = precioConDescuento - costoTotalMensual;
      const margenPct = precioConDescuento > 0 ? (margenMonto / precioConDescuento) * 100 : 0;
      const margenEstado: "OK" | "BAJO" | "CRITICO" =
        margenPct >= margenObj ? "OK" : margenPct >= 10 ? "BAJO" : "CRITICO";

      // PASO 10 — Rent-to-Own
      let rentToOwn: CalcResultPlan["rentToOwn"] | undefined = undefined;
      if (plan.esRentToOwn && costoLandedARS > 0) {
        const costoTotal24Meses = precioConDescuento * 24;
        const diferenciaVsLanded = costoTotal24Meses - costoLandedARS;
        // TEA implícita: r = (costoTotal / landed)^(1/2) - 1 anualizado
        const ratio = costoTotal24Meses / costoLandedARS;
        const teaImplicita = ratio > 0 ? (Math.pow(ratio, 1 / 2) - 1) * 100 : 0;
        rentToOwn = { costoTotal24Meses, diferenciaVsLanded, teaImplicita };
      }

      return {
        planId: plan.id,
        planCodigo: plan.codigo,
        planNombre: plan.nombre,
        esRentToOwn: plan.esRentToOwn,
        duracionMeses: plan.duracionMeses,
        costos: { amortizacionMensual, costoOperativoMensual, costoTotalMensual },
        precios: {
          mensual: { base: precioBaseMensual, conDescuento: precioConDescuento, deposito },
          quincenal: { base: precioBaseMensual, conDescuento: precioQuincenal, deposito },
          semanal: { base: precioBaseMensual, conDescuento: precioSemanal, deposito },
          formasPago,
        },
        margen: { pct: margenPct, monto: margenMonto, estado: margenEstado, objetivo: margenObj },
        rentToOwn,
      };
    });

    return NextResponse.json({
      modeloMoto,
      costoLandedARS,
      costoLandedUSD: costoLandedUSD ?? (tc > 0 ? costoLandedARS / tc : 0),
      tipoCambio: tc,
      margenObjetivoPct: margenObj,
      planes: resultados,
    });
  } catch (err: unknown) {
    console.error("[pricing-engine/calcular POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
