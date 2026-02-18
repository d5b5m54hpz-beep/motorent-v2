import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.accounting.report.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const tipo = url.searchParams.get("tipo") ?? "libro-diario";
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    if (!desde || !hasta) {
      return NextResponse.json(
        { error: "Se requieren parámetros 'desde' y 'hasta'" },
        { status: 400 }
      );
    }

    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);

    switch (tipo) {
      case "libro-diario":
        return await getLibroDiario(fechaDesde, fechaHasta);
      case "libro-mayor":
        return await getLibroMayor(fechaDesde, fechaHasta);
      case "balance-sumas-saldos":
        return await getBalanceSumasSaldos(fechaDesde, fechaHasta);
      case "posicion-iva":
        return await getPosicionIVA(fechaDesde, fechaHasta);
      case "estado-resultados":
        return await getEstadoResultados(fechaDesde, fechaHasta);
      default:
        return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
    }
  } catch (err: unknown) {
    console.error("Error generating report:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

async function getLibroDiario(desde: Date, hasta: Date) {
  const asientos = await prisma.asientoContable.findMany({
    where: {
      fecha: { gte: desde, lte: hasta },
    },
    include: {
      lineas: {
        include: {
          cuenta: { select: { codigo: true, nombre: true } },
        },
        orderBy: { orden: "asc" },
      },
    },
    orderBy: [{ fecha: "asc" }, { numero: "asc" }],
  });

  return NextResponse.json({ data: asientos });
}

async function getLibroMayor(desde: Date, hasta: Date) {
  // Get all cuentas imputables
  const cuentas = await prisma.cuentaContable.findMany({
    where: { imputable: true, activa: true },
    orderBy: { codigo: "asc" },
  });

  const mayor = await Promise.all(
    cuentas.map(async (cuenta) => {
      const lineas = await prisma.lineaAsiento.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: {
            fecha: { gte: desde, lte: hasta },
          },
        },
        include: {
          asiento: { select: { numero: true, fecha: true, descripcion: true } },
        },
        orderBy: { asiento: { fecha: "asc" } },
      });

      let saldoAcumulado = 0;
      const movimientos = lineas.map((linea) => {
        saldoAcumulado += Number(linea.debe) - Number(linea.haber);
        return {
          fecha: linea.asiento.fecha,
          asientoNumero: linea.asiento.numero,
          descripcion: linea.asiento.descripcion,
          debe: Number(linea.debe),
          haber: Number(linea.haber),
          saldo: saldoAcumulado,
        };
      });

      const totalDebe = lineas.reduce((sum, l) => sum + Number(l.debe), 0);
      const totalHaber = lineas.reduce((sum, l) => sum + Number(l.haber), 0);

      return {
        cuenta: {
          codigo: cuenta.codigo,
          nombre: cuenta.nombre,
          tipo: cuenta.tipo,
        },
        movimientos,
        totalDebe,
        totalHaber,
        saldoFinal: saldoAcumulado,
      };
    })
  );

  // Filter out accounts with no movements
  const mayorConMovimientos = mayor.filter((m) => m.movimientos.length > 0);

  return NextResponse.json({ data: mayorConMovimientos });
}

async function getBalanceSumasSaldos(desde: Date, hasta: Date) {
  const cuentas = await prisma.cuentaContable.findMany({
    where: { imputable: true, activa: true },
    orderBy: { codigo: "asc" },
  });

  const balance = await Promise.all(
    cuentas.map(async (cuenta) => {
      const lineas = await prisma.lineaAsiento.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: {
            fecha: { gte: desde, lte: hasta },
          },
        },
      });

      const totalDebe = lineas.reduce((sum, l) => sum + Number(l.debe), 0);
      const totalHaber = lineas.reduce((sum, l) => sum + Number(l.haber), 0);
      const saldo = totalDebe - totalHaber;

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        totalDebe,
        totalHaber,
        saldoDeudor: saldo > 0 ? saldo : 0,
        saldoAcreedor: saldo < 0 ? -saldo : 0,
      };
    })
  );

  // Filter out accounts with no movements
  const balanceConMovimientos = balance.filter((b) => b.totalDebe > 0 || b.totalHaber > 0);

  // Calculate totals
  const totales = balanceConMovimientos.reduce(
    (acc, b) => ({
      totalDebe: acc.totalDebe + b.totalDebe,
      totalHaber: acc.totalHaber + b.totalHaber,
      totalSaldoDeudor: acc.totalSaldoDeudor + b.saldoDeudor,
      totalSaldoAcreedor: acc.totalSaldoAcreedor + b.saldoAcreedor,
    }),
    { totalDebe: 0, totalHaber: 0, totalSaldoDeudor: 0, totalSaldoAcreedor: 0 }
  );

  return NextResponse.json({ data: balanceConMovimientos, totales });
}

async function getPosicionIVA(desde: Date, hasta: Date) {
  // IVA Débito Fiscal (ventas) - cuenta 2.1.02.001
  const ivaDebito = await prisma.lineaAsiento.findMany({
    where: {
      cuenta: { codigo: "2.1.02.001" },
      asiento: { fecha: { gte: desde, lte: hasta } },
    },
    include: {
      asiento: { select: { numero: true, fecha: true, descripcion: true } },
    },
  });

  // IVA Crédito Fiscal (compras) - cuenta 1.1.04
  const ivaCredito = await prisma.lineaAsiento.findMany({
    where: {
      cuenta: { codigo: "1.1.04" },
      asiento: { fecha: { gte: desde, lte: hasta } },
    },
    include: {
      asiento: { select: { numero: true, fecha: true, descripcion: true } },
    },
  });

  const totalDebito = ivaDebito.reduce((sum, l) => sum + Number(l.haber) - Number(l.debe), 0);
  const totalCredito = ivaCredito.reduce((sum, l) => sum + Number(l.debe) - Number(l.haber), 0);
  const saldo = totalDebito - totalCredito;

  return NextResponse.json({
    data: {
      ivaDebito: {
        movimientos: ivaDebito.map((l) => ({
          fecha: l.asiento.fecha,
          asientoNumero: l.asiento.numero,
          descripcion: l.asiento.descripcion,
          monto: Number(l.haber) - Number(l.debe),
        })),
        total: totalDebito,
      },
      ivaCredito: {
        movimientos: ivaCredito.map((l) => ({
          fecha: l.asiento.fecha,
          asientoNumero: l.asiento.numero,
          descripcion: l.asiento.descripcion,
          monto: Number(l.debe) - Number(l.haber),
        })),
        total: totalCredito,
      },
      saldo,
      tipo: saldo > 0 ? "A PAGAR" : saldo < 0 ? "A FAVOR" : "NEUTRAL",
    },
  });
}

async function getEstadoResultados(desde: Date, hasta: Date) {
  // Get all Ingresos (cuenta 4.x)
  const ingresos = await prisma.cuentaContable.findMany({
    where: { tipo: "INGRESO", imputable: true, activa: true },
    orderBy: { codigo: "asc" },
  });

  const ingresosData = await Promise.all(
    ingresos.map(async (cuenta) => {
      const lineas = await prisma.lineaAsiento.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: { fecha: { gte: desde, lte: hasta } },
        },
      });

      const total = lineas.reduce((sum, l) => sum + Number(l.haber) - Number(l.debe), 0);

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        monto: total,
      };
    })
  );

  // Get all Egresos (cuenta 5.x)
  const egresos = await prisma.cuentaContable.findMany({
    where: { tipo: "EGRESO", imputable: true, activa: true },
    orderBy: { codigo: "asc" },
  });

  const egresosData = await Promise.all(
    egresos.map(async (cuenta) => {
      const lineas = await prisma.lineaAsiento.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: { fecha: { gte: desde, lte: hasta } },
        },
      });

      const total = lineas.reduce((sum, l) => sum + Number(l.debe) - Number(l.haber), 0);

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        monto: total,
      };
    })
  );

  // Filter out zero amounts
  const ingresosConMovimientos = ingresosData.filter((i) => i.monto > 0);
  const egresosConMovimientos = egresosData.filter((e) => e.monto > 0);

  const totalIngresos = ingresosConMovimientos.reduce((sum, i) => sum + i.monto, 0);
  const totalEgresos = egresosConMovimientos.reduce((sum, e) => sum + e.monto, 0);
  const resultado = totalIngresos - totalEgresos;

  return NextResponse.json({
    data: {
      ingresos: ingresosConMovimientos,
      egresos: egresosConMovimientos,
      totalIngresos,
      totalEgresos,
      resultado,
      tipo: resultado > 0 ? "GANANCIA" : resultado < 0 ? "PÉRDIDA" : "PUNTO DE EQUILIBRIO",
    },
  });
}
