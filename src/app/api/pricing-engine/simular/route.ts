import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { z } from "zod";

const simularSchema = z.object({
  modeloMoto: z.string().min(1),
  planCodigo: z.string().min(1),
  frecuenciaPago: z.enum(["MENSUAL", "QUINCENAL", "SEMANAL"]),
  formaPago: z.enum(["TRANSFERENCIA", "MERCADOPAGO", "EFECTIVO"]),
  costoLandedARS: z.number().min(0).optional(),
  margenObjetivoPct: z.number().min(0).max(100).optional().default(25),
});

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission("pricing.rental.config.view", "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = simularSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { modeloMoto, planCodigo, frecuenciaPago, formaPago, costoLandedARS: costoInput, margenObjetivoPct } = parsed.data;

    const [config, plan] = await Promise.all([
      prisma.costoOperativoConfig.findUnique({ where: { id: "default" } }),
      prisma.planAlquiler.findUnique({ where: { codigo: planCodigo } }),
    ]);

    if (!config || !plan) {
      return NextResponse.json({ error: "Config o plan no encontrado" }, { status: 404 });
    }

    // Try to get stored price
    const storedPrecio = await prisma.precioModeloAlquiler.findUnique({
      where: { modeloMoto_planId: { modeloMoto, planId: plan.id } },
    });

    const costoLandedARS = costoInput ?? Number(storedPrecio?.costoLandedARS ?? 0);
    const margenObj = margenObjetivoPct ?? 25;

    // Recalculate
    const seguro = Number(config.seguroTotal);
    const impuestosMensual = (Number(config.patenteAnual) + Number(config.vtvAnual) + Number(config.otrosImpuestosAnuales)) / 12;
    const iot = Number(config.costoIoTMensual);
    const mto = Number(config.mantenimientoTotal);
    const almac = Number(config.costoAlmacenamientoPorMoto);
    const admin = Number(config.costoAdminPorMoto);
    const reservaPct = Number(config.reservaContingenciaPct);
    const reservaMensual = costoLandedARS > 0 ? (costoLandedARS * reservaPct / 100) / 12 : 0;
    const costoOperativoMensual = seguro + impuestosMensual + iot + mto + reservaMensual + almac + admin;

    let amortizacionMensual = 0;
    if (costoLandedARS > 0) {
      amortizacionMensual = plan.esRentToOwn
        ? costoLandedARS / plan.duracionMeses
        : (costoLandedARS * 0.85) / 48;
    }
    const costoTotalMensual = amortizacionMensual + costoOperativoMensual;
    const margenFactor = margenObj > 0 ? 1 - margenObj / 100 : 1;
    const precioBaseMensual = margenFactor > 0 ? costoTotalMensual / margenFactor : costoTotalMensual * 1.25;
    const descPct = Number(plan.descuentoPct);
    const precioConDescuento = precioBaseMensual * (1 - descPct / 100);

    // Freq recargo
    const recQuincenalPct = Number(plan.recargoQuincenalPct);
    const recSemanalPct = Number(plan.recargoSemanalPct);
    let precioFrecuencia = precioConDescuento;
    let recargoFrecuencia = 0;
    if (frecuenciaPago === "QUINCENAL") {
      precioFrecuencia = (precioConDescuento / 2) * (1 + recQuincenalPct / 100);
      recargoFrecuencia = recQuincenalPct;
    } else if (frecuenciaPago === "SEMANAL") {
      precioFrecuencia = (precioConDescuento / 4) * (1 + recSemanalPct / 100);
      recargoFrecuencia = recSemanalPct;
    }

    // Payment method recargo
    const recMPPct = Number(plan.recargoMercadoPagoPct);
    const recEfectivoPct = Number(plan.recargoEfectivoPct);
    let recargoFormaPago = 0;
    if (formaPago === "MERCADOPAGO") recargoFormaPago = recMPPct;
    else if (formaPago === "EFECTIVO") recargoFormaPago = recEfectivoPct;
    const precioFinal = precioFrecuencia * (1 + recargoFormaPago / 100);

    // Depósito
    const depMeses = Number(plan.depositoMeses);
    const baseDeposito = plan.depositoConDescuento ? precioConDescuento : precioBaseMensual;
    const deposito = baseDeposito * depMeses;

    // Desglose costos
    const desgloseCostos = {
      amortizacion: amortizacionMensual,
      seguro,
      impuestos: impuestosMensual,
      iot,
      mantenimiento: mto,
      reservaContingencia: reservaMensual,
      almacenamiento: almac,
      administracion: admin,
      total: costoTotalMensual,
    };

    // Rent-to-own
    let costoTotal24Meses: number | null = null;
    if (plan.esRentToOwn) {
      costoTotal24Meses = precioConDescuento * 24;
    }

    // Save simulation
    const sim = await prisma.simulacionAlquiler.create({
      data: {
        modeloMoto,
        planCodigo,
        frecuenciaPago,
        formaPago,
        precioBaseMensual,
        descuentoPlan: descPct,
        recargoFrecuencia,
        recargoFormaPago,
        precioFinalMensual: precioFinal,
        precioFinalSemanal: frecuenciaPago === "SEMANAL" ? precioFinal : null,
        deposito,
        costoTotal24Meses,
        desgloseCostos,
        creadoPor: userId,
      },
    });

    return NextResponse.json({
      simulacionId: sim.id,
      modeloMoto,
      planCodigo,
      planNombre: plan.nombre,
      esRentToOwn: plan.esRentToOwn,
      frecuenciaPago,
      formaPago,
      precioFinal,
      precioMensual: precioConDescuento,
      deposito,
      costoLandedARS,
      desgloseCostos,
      margenPct: precioConDescuento > 0 ? ((precioConDescuento - costoTotalMensual) / precioConDescuento) * 100 : 0,
      costoTotal24Meses,
    });
  } catch (err: unknown) {
    console.error("[pricing-engine/simular POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
