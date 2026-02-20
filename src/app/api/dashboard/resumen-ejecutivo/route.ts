import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.dashboard.executive.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const comparar = url.searchParams.get("comparar") === "true";

    const fechaDesde = desde ? new Date(desde) : new Date(new Date().setDate(1)); // Primer día del mes
    const fechaHasta = hasta ? new Date(hasta) : new Date(); // Hoy

    // Para comparación, calcular período anterior
    const diffMs = fechaHasta.getTime() - fechaDesde.getTime();
    const fechaDesdeAnterior = new Date(fechaDesde.getTime() - diffMs);
    const fechaHastaAnterior = new Date(fechaHasta.getTime() - diffMs);

    const where = {
      createdAt: {
        gte: fechaDesde,
        lte: fechaHasta,
      },
    };

    const whereAnterior = comparar
      ? {
          createdAt: {
            gte: fechaDesdeAnterior,
            lte: fechaHastaAnterior,
          },
        }
      : null;

    // Ingresos del período (facturas emitidas)
    const [ingresosPeriodo, ingresosAnterior] = await Promise.all([
      prisma.factura.aggregate({
        where: { ...where, emitida: true },
        _sum: { montoTotal: true },
      }),
      whereAnterior
        ? prisma.factura.aggregate({
            where: { ...whereAnterior, emitida: true },
            _sum: { montoTotal: true },
          })
        : Promise.resolve(null),
    ]);

    const ingresos = Number(ingresosPeriodo._sum.montoTotal) || 0;
    const ingresosAnt = Number(ingresosAnterior?._sum.montoTotal) || 0;
    const variacionIngresos = ingresosAnt > 0 ? ((ingresos - ingresosAnt) / ingresosAnt) * 100 : 0;

    // Gastos del período (facturas de compra + gastos)
    const [gastosPeriodo, gastosAnterior] = await Promise.all([
      prisma.facturaCompra.aggregate({
        where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
        _sum: { total: true },
      }),
      whereAnterior
        ? prisma.facturaCompra.aggregate({
            where: { fecha: { gte: fechaDesdeAnterior, lte: fechaHastaAnterior } },
            _sum: { total: true },
          })
        : Promise.resolve(null),
    ]);

    const gastos = Number(gastosPeriodo._sum.total) || 0;
    const gastosAnt = Number(gastosAnterior?._sum.total) || 0;
    const variacionGastos = gastosAnt > 0 ? ((gastos - gastosAnt) / gastosAnt) * 100 : 0;

    // Resultado Neto
    const resultado = ingresos - gastos;
    const resultadoAnt = ingresosAnt - gastosAnt;
    const variacionResultado =
      resultadoAnt !== 0 ? ((resultado - resultadoAnt) / Math.abs(resultadoAnt)) * 100 : 0;

    // Margen Neto
    const margenNeto = ingresos > 0 ? (resultado / ingresos) * 100 : 0;
    const margenNetoAnt = ingresosAnt > 0 ? (resultadoAnt / ingresosAnt) * 100 : 0;
    const variacionMargen = margenNeto - margenNetoAnt;

    // Motos y ocupación
    const [totalMotos, motosAlquiladas] = await Promise.all([
      prisma.moto.count({ where: { estado: { not: "BAJA_DEFINITIVA" } } }),
      prisma.moto.count({ where: { estado: "ALQUILADA" } }),
    ]);

    const tasaOcupacion = totalMotos > 0 ? (motosAlquiladas / totalMotos) * 100 : 0;

    // Contratos activos
    const contratosActivos = await prisma.contrato.count({ where: { estado: "ACTIVO" } });

    // Clientes totales
    const clientes = await prisma.cliente.count();

    // Pagos pendientes
    const pagosPendientes = await prisma.pago.aggregate({
      where: { estado: { in: ["PENDIENTE"] } },
      _count: { id: true },
      _sum: { monto: true },
    });

    // EBITDA simplificado (ingresos - gastos operativos, sin contar depreciación ni intereses)
    const ebitda = resultado; // Simplificado por ahora

    return NextResponse.json({
      ingresos: {
        valor: Math.round(ingresos),
        variacion: Math.round(variacionIngresos * 10) / 10,
      },
      gastos: {
        valor: Math.round(gastos),
        variacion: Math.round(variacionGastos * 10) / 10,
      },
      resultado: {
        valor: Math.round(resultado),
        variacion: Math.round(variacionResultado * 10) / 10,
      },
      margenNeto: {
        valor: Math.round(margenNeto * 10) / 10,
        variacion: Math.round(variacionMargen * 10) / 10,
      },
      motos: {
        total: totalMotos,
        disponibles: totalMotos - motosAlquiladas,
      },
      tasaOcupacion: Math.round(tasaOcupacion),
      contratosActivos,
      clientes,
      pagosPendientes: {
        cantidad: pagosPendientes._count.id,
        monto: Math.round(Number(pagosPendientes._sum.monto) || 0),
      },
      ebitda: Math.round(ebitda),
    });
  } catch (err: unknown) {
    console.error("Error fetching resumen ejecutivo:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
