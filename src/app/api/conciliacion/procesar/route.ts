import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.process.start,
    "execute",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const { cuentaBancariaId, fechaDesde, fechaHasta } = body;

    if (!cuentaBancariaId || !fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: "cuentaBancariaId, fechaDesde y fechaHasta son requeridos" },
        { status: 400 }
      );
    }

    const desde = new Date(fechaDesde);
    const hasta = new Date(fechaHasta);

    // ─── Step 0: Create Conciliacion record ─────────────────────────────────
    const conciliacion = await prisma.conciliacion.create({
      data: {
        cuentaBancariaId,
        fechaDesde: desde,
        fechaHasta: hasta,
        estado: "EN_PROCESO",
        userId: userId!,
      },
    });

    // ─── Fetch & assign pending extractos to this conciliacion ──────────────
    await prisma.extractoBancario.updateMany({
      where: {
        cuentaBancariaId,
        estado: "PENDIENTE",
        fecha: { gte: desde, lte: hasta },
      },
      data: { conciliacionId: conciliacion.id },
    });

    const extractos = await prisma.extractoBancario.findMany({
      where: { conciliacionId: conciliacion.id },
    });

    let totalConciliados = 0;
    let matchAutomaticos = 0;

    // Track already-matched entity IDs to avoid duplicate matches
    const matchedPagoIds = new Set<string>();
    const matchedGastoIds = new Set<string>();

    // ─── Step 1: Exact match by amount + date (±1 day) ──────────────────────
    for (const extracto of extractos) {
      const montoNum = extracto.monto.toNumber();
      const fechaMin = new Date(extracto.fecha);
      fechaMin.setDate(fechaMin.getDate() - 1);
      const fechaMax = new Date(extracto.fecha);
      fechaMax.setDate(fechaMax.getDate() + 1);

      if (extracto.tipo === "CREDITO") {
        const pagos = await prisma.pago.findMany({
          where: {
            monto: montoNum,
            pagadoAt: { gte: fechaMin, lte: fechaMax },
            estado: "APROBADO",
            id: { notIn: Array.from(matchedPagoIds) },
          },
        });

        if (pagos.length === 1) {
          matchedPagoIds.add(pagos[0].id);
          await prisma.conciliacionMatch.create({
            data: {
              conciliacionId: conciliacion.id,
              extractoId: extracto.id,
              tipoMatch: "AUTO_EXACTO",
              confianza: 100,
              pagoId: pagos[0].id,
            },
          });
          await prisma.extractoBancario.update({
            where: { id: extracto.id },
            data: { estado: "CONCILIADO" },
          });
          totalConciliados++;
          matchAutomaticos++;
        }
      } else if (extracto.tipo === "DEBITO") {
        const montoAbs = Math.abs(montoNum);
        const gastos = await prisma.gasto.findMany({
          where: {
            monto: montoAbs,
            fecha: { gte: fechaMin, lte: fechaMax },
            id: { notIn: Array.from(matchedGastoIds) },
          },
        });

        if (gastos.length === 1) {
          matchedGastoIds.add(gastos[0].id);
          await prisma.conciliacionMatch.create({
            data: {
              conciliacionId: conciliacion.id,
              extractoId: extracto.id,
              tipoMatch: "AUTO_EXACTO",
              confianza: 100,
              gastoId: gastos[0].id,
            },
          });
          await prisma.extractoBancario.update({
            where: { id: extracto.id },
            data: { estado: "CONCILIADO" },
          });
          totalConciliados++;
          matchAutomaticos++;
        }
      }
    }

    // ─── Step 2: Approximate match by amount ±5%, date ±7 days ──────────────
    const pendingAfterStep1 = await prisma.extractoBancario.findMany({
      where: { conciliacionId: conciliacion.id, estado: "PENDIENTE" },
    });

    for (const extracto of pendingAfterStep1) {
      const montoNum = extracto.monto.toNumber();
      const fechaMin = new Date(extracto.fecha);
      fechaMin.setDate(fechaMin.getDate() - 7);
      const fechaMax = new Date(extracto.fecha);
      fechaMax.setDate(fechaMax.getDate() + 7);

      if (extracto.tipo === "CREDITO") {
        const montoLow = montoNum * 0.95;
        const montoHigh = montoNum * 1.05;

        const pagos = await prisma.pago.findMany({
          where: {
            monto: { gte: montoLow, lte: montoHigh },
            pagadoAt: { gte: fechaMin, lte: fechaMax },
            estado: "APROBADO",
            id: { notIn: Array.from(matchedPagoIds) },
          },
        });

        if (pagos.length > 0) {
          const pago = pagos[0];
          matchedPagoIds.add(pago.id);
          const daysDiff = pago.pagadoAt
            ? Math.abs(
                Math.round(
                  (extracto.fecha.getTime() - pago.pagadoAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 7;
          const confianza = Math.max(60, 90 - daysDiff * 5);

          await prisma.conciliacionMatch.create({
            data: {
              conciliacionId: conciliacion.id,
              extractoId: extracto.id,
              tipoMatch: "AUTO_APROXIMADO",
              confianza,
              pagoId: pago.id,
            },
          });
          matchAutomaticos++;
        }
      } else if (extracto.tipo === "DEBITO") {
        const montoAbs = Math.abs(montoNum);
        const montoLow = montoAbs * 0.95;
        const montoHigh = montoAbs * 1.05;

        const gastos = await prisma.gasto.findMany({
          where: {
            monto: { gte: montoLow, lte: montoHigh },
            fecha: { gte: fechaMin, lte: fechaMax },
            id: { notIn: Array.from(matchedGastoIds) },
          },
        });

        if (gastos.length > 0) {
          const gasto = gastos[0];
          matchedGastoIds.add(gasto.id);
          const daysDiff = Math.abs(
            Math.round(
              (extracto.fecha.getTime() - gasto.fecha.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          const confianza = Math.max(60, 90 - daysDiff * 5);

          await prisma.conciliacionMatch.create({
            data: {
              conciliacionId: conciliacion.id,
              extractoId: extracto.id,
              tipoMatch: "AUTO_APROXIMADO",
              confianza,
              gastoId: gasto.id,
            },
          });
          matchAutomaticos++;
        }
      }
    }

    // ─── Step 3: Reference match ────────────────────────────────────────────
    const pendingAfterStep2 = await prisma.extractoBancario.findMany({
      where: {
        conciliacionId: conciliacion.id,
        estado: "PENDIENTE",
        referencia: { not: null },
      },
    });

    for (const extracto of pendingAfterStep2) {
      if (!extracto.referencia) continue;

      const pagos = await prisma.pago.findMany({
        where: {
          referencia: extracto.referencia,
          id: { notIn: Array.from(matchedPagoIds) },
        },
      });

      if (pagos.length > 0) {
        matchedPagoIds.add(pagos[0].id);
        await prisma.conciliacionMatch.create({
          data: {
            conciliacionId: conciliacion.id,
            extractoId: extracto.id,
            tipoMatch: "AUTO_EXACTO",
            confianza: 95,
            pagoId: pagos[0].id,
          },
        });
        await prisma.extractoBancario.update({
          where: { id: extracto.id },
          data: { estado: "CONCILIADO" },
        });
        totalConciliados++;
        matchAutomaticos++;
      }
    }

    // ─── Final: Update Conciliacion with statistics ─────────────────────────
    const totalMovimientos = extractos.length;
    const totalNoConciliados = totalMovimientos - totalConciliados;

    const updated = await prisma.conciliacion.update({
      where: { id: conciliacion.id },
      data: {
        totalMovimientos,
        totalConciliados,
        totalNoConciliados,
        matchAutomaticos,
      },
      include: {
        cuentaBancaria: true,
        extractos: { orderBy: { fecha: "asc" } },
        matches: true,
      },
    });

    eventBus.emit(
      OPERATIONS.reconciliation.process.start,
      "Conciliacion",
      conciliacion.id,
      { conciliacionId: conciliacion.id, totalMovimientos, matchAutomaticos },
      userId
    );

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("[conciliacion/procesar] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
