import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.finance.indicators.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // ═══════════════════════════════════════════════════════════════════════════
    // BALANCE SHEET (simplificado para cálculos)
    // ═══════════════════════════════════════════════════════════════════════════

    // ACTIVOS
    // Activo Corriente: Caja + Cuentas por Cobrar
    const cajaYBancos = 0; // TODO: implementar cuando haya modelo Cuenta/Caja
    const cuentasPorCobrar = await prisma.pago.aggregate({
      where: { estado: "pendiente" },
      _sum: { monto: true },
    });
    const activoCorriente = cajaYBancos + (cuentasPorCobrar._sum.monto || 0);

    // Activo No Corriente: Valor de la flota (motos activas)
    const flota = await prisma.moto.aggregate({
      where: { estado: { not: "baja" } },
      _sum: { valorCompra: true },
    });
    const activoNoCorriente = Number(flota._sum.valorCompra || 0);

    const totalActivos = activoCorriente + activoNoCorriente;

    // PASIVOS
    // Pasivo Corriente: Cuentas por pagar a proveedores (facturas compra pendientes)
    const cuentasPorPagar = await prisma.facturaCompra.aggregate({
      where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
      _sum: { total: true },
    });
    const pasivoCorriente = cuentasPorPagar._sum.total || 0;

    // Pasivo No Corriente: Préstamos a largo plazo (placeholder)
    const pasivoNoCorriente = 0; // TODO: agregar cuando haya modelo de Préstamos

    const totalPasivos = pasivoCorriente + pasivoNoCorriente;

    // PATRIMONIO NETO
    const patrimonioNeto = totalActivos - totalPasivos;

    // ═══════════════════════════════════════════════════════════════════════════
    // INCOME STATEMENT (mes actual)
    // ═══════════════════════════════════════════════════════════════════════════

    const ingresos = await prisma.pago.aggregate({
      where: { estado: "aprobado", pagadoAt: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });
    const totalIngresos = ingresos._sum.monto || 0;

    const gastos = await prisma.gasto.aggregate({
      where: { fecha: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    });
    const totalGastos = gastos._sum.monto || 0;

    const gastosOperativos = await prisma.gasto.aggregate({
      where: {
        fecha: { gte: inicioMes, lte: finMes },
        categoria: {
          in: [
            "MANTENIMIENTO",
            "REPUESTOS",
            "COMBUSTIBLE",
            "ALQUILER_LOCAL",
            "SERVICIOS",
            "MARKETING",
            "ADMINISTRATIVO",
          ],
        },
      },
      _sum: { monto: true },
    });
    const totalGastosOperativos = gastosOperativos._sum.monto || 0;

    const resultadoNeto = totalIngresos - totalGastos;
    const ebit = totalIngresos - totalGastosOperativos;

    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR RATIOS
    // ═══════════════════════════════════════════════════════════════════════════

    // ROE (Return on Equity) = Resultado Neto / Patrimonio Neto * 100
    const roe = patrimonioNeto > 0 ? (resultadoNeto / patrimonioNeto) * 100 : 0;

    // ROA (Return on Assets) = Resultado Neto / Total Activos * 100
    const roa = totalActivos > 0 ? (resultadoNeto / totalActivos) * 100 : 0;

    // Margen Operativo = EBIT / Ingresos * 100
    const margenOperativo = totalIngresos > 0 ? (ebit / totalIngresos) * 100 : 0;

    // Rotación de Activos = Ingresos / Total Activos (anualizado)
    const rotacionActivos = totalActivos > 0 ? (totalIngresos * 12) / totalActivos : 0;

    // Ratio Corriente = Activo Corriente / Pasivo Corriente
    const ratioCorriente = pasivoCorriente > 0 ? activoCorriente / pasivoCorriente : 0;

    // Endeudamiento = Pasivo Total / Activo Total * 100
    const endeudamiento = totalActivos > 0 ? (totalPasivos / totalActivos) * 100 : 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // HISTÓRICO (últimos 12 meses para sparklines)
    // ═══════════════════════════════════════════════════════════════════════════

    const historico = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [ing, gst, gstOp] = await Promise.all([
        prisma.pago.aggregate({
          where: { estado: "aprobado", pagadoAt: { gte: d, lte: fin } },
          _sum: { monto: true },
        }),
        prisma.gasto.aggregate({
          where: { fecha: { gte: d, lte: fin } },
          _sum: { monto: true },
        }),
        prisma.gasto.aggregate({
          where: {
            fecha: { gte: d, lte: fin },
            categoria: {
              in: [
                "MANTENIMIENTO",
                "REPUESTOS",
                "COMBUSTIBLE",
                "ALQUILER_LOCAL",
                "SERVICIOS",
                "MARKETING",
                "ADMINISTRATIVO",
              ],
            },
          },
          _sum: { monto: true },
        }),
      ]);

      const mesIngresos = ing._sum.monto || 0;
      const mesGastos = gst._sum.monto || 0;
      const mesGastosOp = gstOp._sum.monto || 0;
      const mesResultado = mesIngresos - mesGastos;
      const mesEbit = mesIngresos - mesGastosOp;

      // Calcular ratios mensuales (usando valores actuales de balance)
      const mesRoe = patrimonioNeto > 0 ? (mesResultado / patrimonioNeto) * 100 : 0;
      const mesRoa = totalActivos > 0 ? (mesResultado / totalActivos) * 100 : 0;
      const mesMargenOp = mesIngresos > 0 ? (mesEbit / mesIngresos) * 100 : 0;
      const mesRotacion = totalActivos > 0 ? (mesIngresos * 12) / totalActivos : 0;

      historico.push({
        mes: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
        roe: Number(mesRoe.toFixed(2)),
        roa: Number(mesRoa.toFixed(2)),
        margenOperativo: Number(mesMargenOp.toFixed(2)),
        rotacionActivos: Number(mesRotacion.toFixed(2)),
        ratioCorriente: Number(ratioCorriente.toFixed(2)), // Constante (simplificado)
        endeudamiento: Number(endeudamiento.toFixed(2)), // Constante (simplificado)
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BENCHMARKS DE LA INDUSTRIA (valores de referencia para alquiler de motos)
    // ═══════════════════════════════════════════════════════════════════════════

    const benchmarks = {
      roe: { bajo: 10, medio: 20, alto: 30 },
      roa: { bajo: 5, medio: 10, alto: 15 },
      margenOperativo: { bajo: 15, medio: 25, alto: 35 },
      rotacionActivos: { bajo: 0.5, medio: 1.0, alto: 1.5 },
      ratioCorriente: { bajo: 1.0, medio: 1.5, alto: 2.0 },
      endeudamiento: { bajo: 30, medio: 50, alto: 70 }, // Invertido: menor es mejor
    };

    return NextResponse.json({
      ratios: {
        roe: { valor: Number(roe.toFixed(2)), label: "ROE", unidad: "%", descripcion: "Rentabilidad sobre patrimonio" },
        roa: { valor: Number(roa.toFixed(2)), label: "ROA", unidad: "%", descripcion: "Rentabilidad sobre activos" },
        margenOperativo: {
          valor: Number(margenOperativo.toFixed(2)),
          label: "Margen Operativo",
          unidad: "%",
          descripcion: "EBIT / Ingresos",
        },
        rotacionActivos: {
          valor: Number(rotacionActivos.toFixed(2)),
          label: "Rotación de Activos",
          unidad: "x",
          descripcion: "Ingresos / Activos (anual)",
        },
        ratioCorriente: {
          valor: Number(ratioCorriente.toFixed(2)),
          label: "Ratio Corriente",
          unidad: "x",
          descripcion: "Activo Corriente / Pasivo Corriente",
        },
        endeudamiento: {
          valor: Number(endeudamiento.toFixed(2)),
          label: "Endeudamiento",
          unidad: "%",
          descripcion: "Pasivo / Activo Total",
        },
      },
      historico,
      benchmarks,
      balance: {
        activoCorriente,
        activoNoCorriente,
        totalActivos,
        pasivoCorriente,
        pasivoNoCorriente,
        totalPasivos,
        patrimonioNeto,
      },
    });
  } catch (err: unknown) {
    console.error("Error calculando indicadores económicos:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
