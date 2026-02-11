import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");
    const comparar = url.searchParams.get("comparar") === "true";

    if (!desde || !hasta) {
      return NextResponse.json(
        { error: "Parámetros desde y hasta son requeridos" },
        { status: 400 }
      );
    }

    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);

    // Calcular período anterior para comparación
    const diasDiferencia = Math.ceil((fechaHasta.getTime() - fechaDesde.getTime()) / (1000 * 60 * 60 * 24));
    const fechaDesdeAnterior = new Date(fechaDesde);
    fechaDesdeAnterior.setDate(fechaDesdeAnterior.getDate() - diasDiferencia);
    const fechaHastaAnterior = new Date(fechaDesde);
    fechaHastaAnterior.setDate(fechaHastaAnterior.getDate() - 1);

    // ═══════════════════════════════════════════════════════════════════════════
    // INGRESOS OPERATIVOS
    // ═══════════════════════════════════════════════════════════════════════════

    // Ingresos por alquileres (pagos aprobados de contratos)
    const ingresosAlquileres = await prisma.pago.aggregate({
      where: {
        estado: "aprobado",
        pagadoAt: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      _sum: {
        monto: true,
      },
    });

    // Ingresos por ventas de repuestos (si existen)
    const ingresosRepuestos = 0; // TODO: implementar cuando haya ventas de repuestos

    const totalIngresos = (ingresosAlquileres._sum.monto || 0) + ingresosRepuestos;

    // Ingresos período anterior
    let totalIngresosAnterior = 0;
    if (comparar) {
      const ingresosAnterior = await prisma.pago.aggregate({
        where: {
          estado: "aprobado",
          pagadoAt: {
            gte: fechaDesdeAnterior,
            lte: fechaHastaAnterior,
          },
        },
        _sum: {
          monto: true,
        },
      });
      totalIngresosAnterior = ingresosAnterior._sum.monto || 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COSTOS DIRECTOS
    // ═══════════════════════════════════════════════════════════════════════════

    const gastosDirectos = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
        categoria: {
          in: ["MANTENIMIENTO", "REPUESTOS", "COMBUSTIBLE", "SEGURO", "GRUA"],
        },
      },
      _sum: {
        monto: true,
      },
    });

    // Depreciación de flota (TODO: calcular desde tabla Amortizacion)
    const depreciacionFlota = 0;

    const totalCostosDirectos = (gastosDirectos._sum.monto || 0) + depreciacionFlota;

    // Costos directos período anterior
    let totalCostosDirectosAnterior = 0;
    if (comparar) {
      const gastosDirectosAnterior = await prisma.gasto.aggregate({
        where: {
          fecha: {
            gte: fechaDesdeAnterior,
            lte: fechaHastaAnterior,
          },
          categoria: {
            in: ["MANTENIMIENTO", "REPUESTOS", "COMBUSTIBLE", "SEGURO", "GRUA"],
          },
        },
        _sum: {
          monto: true,
        },
      });
      totalCostosDirectosAnterior = gastosDirectosAnterior._sum.monto || 0;
    }

    const margenBruto = totalIngresos - totalCostosDirectos;
    const margenBrutoAnterior = totalIngresosAnterior - totalCostosDirectosAnterior;

    // ═══════════════════════════════════════════════════════════════════════════
    // GASTOS OPERATIVOS
    // ═══════════════════════════════════════════════════════════════════════════

    // Sueldos (de recibos de sueldo)
    const sueldos = await prisma.reciboSueldo.aggregate({
      where: {
        fechaPago: {
          gte: fechaDesde.toISOString().slice(0, 10),
          lte: fechaHasta.toISOString().slice(0, 10),
        },
        estado: {
          not: "ANULADO",
        },
      },
      _sum: {
        netoAPagar: true,
      },
    });

    // Otros gastos operativos
    const gastosOperativos = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
        categoria: {
          in: ["ALQUILER_LOCAL", "SERVICIOS", "MARKETING", "ADMINISTRATIVO"],
        },
      },
      _sum: {
        monto: true,
      },
    });

    const totalGastosOperativos = (sueldos._sum.netoAPagar || 0) + (gastosOperativos._sum.monto || 0);

    // Gastos operativos período anterior
    let totalGastosOperativosAnterior = 0;
    if (comparar) {
      const sueldosAnterior = await prisma.reciboSueldo.aggregate({
        where: {
          fechaPago: {
            gte: fechaDesdeAnterior.toISOString().slice(0, 10),
            lte: fechaHastaAnterior.toISOString().slice(0, 10),
          },
          estado: {
            not: "ANULADO",
          },
        },
        _sum: {
          netoAPagar: true,
        },
      });

      const gastosOperativosAnterior = await prisma.gasto.aggregate({
        where: {
          fecha: {
            gte: fechaDesdeAnterior,
            lte: fechaHastaAnterior,
          },
          categoria: {
            in: ["ALQUILER_LOCAL", "SERVICIOS", "MARKETING", "ADMINISTRATIVO"],
          },
        },
        _sum: {
          monto: true,
        },
      });

      totalGastosOperativosAnterior = (sueldosAnterior._sum.netoAPagar || 0) + (gastosOperativosAnterior._sum.monto || 0);
    }

    const ebitda = margenBruto - totalGastosOperativos;
    const ebitdaAnterior = margenBrutoAnterior - totalGastosOperativosAnterior;

    // ═══════════════════════════════════════════════════════════════════════════
    // RESULTADO OPERATIVO
    // ═══════════════════════════════════════════════════════════════════════════

    const ebit = ebitda - depreciacionFlota;
    const ebitAnterior = ebitdaAnterior - depreciacionFlota;

    // ═══════════════════════════════════════════════════════════════════════════
    // IMPUESTOS
    // ═══════════════════════════════════════════════════════════════════════════

    const impuestos = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
        categoria: "IMPUESTOS",
      },
      _sum: {
        monto: true,
      },
    });

    const totalImpuestos = impuestos._sum.monto || 0;

    let totalImpuestosAnterior = 0;
    if (comparar) {
      const impuestosAnterior = await prisma.gasto.aggregate({
        where: {
          fecha: {
            gte: fechaDesdeAnterior,
            lte: fechaHastaAnterior,
          },
          categoria: "IMPUESTOS",
        },
        _sum: {
          monto: true,
        },
      });
      totalImpuestosAnterior = impuestosAnterior._sum.monto || 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RESULTADO NETO
    // ═══════════════════════════════════════════════════════════════════════════

    const resultadoNeto = ebit - totalImpuestos;
    const resultadoNetoAnterior = ebitAnterior - totalImpuestosAnterior;

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      periodo: { desde, hasta },
      ingresos: {
        alquileres: ingresosAlquileres._sum.monto || 0,
        repuestos: ingresosRepuestos,
        total: totalIngresos,
        porcentaje: 100,
      },
      costosDirectos: {
        mantenimiento: gastosDirectos._sum.monto || 0,
        depreciacion: depreciacionFlota,
        total: totalCostosDirectos,
        porcentaje: totalIngresos > 0 ? (totalCostosDirectos / totalIngresos) * 100 : 0,
      },
      margenBruto: {
        valor: margenBruto,
        porcentaje: totalIngresos > 0 ? (margenBruto / totalIngresos) * 100 : 0,
      },
      gastosOperativos: {
        sueldos: sueldos._sum.netoAPagar || 0,
        otros: gastosOperativos._sum.monto || 0,
        total: totalGastosOperativos,
        porcentaje: totalIngresos > 0 ? (totalGastosOperativos / totalIngresos) * 100 : 0,
      },
      ebitda: {
        valor: ebitda,
        porcentaje: totalIngresos > 0 ? (ebitda / totalIngresos) * 100 : 0,
      },
      ebit: {
        valor: ebit,
        porcentaje: totalIngresos > 0 ? (ebit / totalIngresos) * 100 : 0,
      },
      impuestos: {
        valor: totalImpuestos,
        porcentaje: totalIngresos > 0 ? (totalImpuestos / totalIngresos) * 100 : 0,
      },
      resultadoNeto: {
        valor: resultadoNeto,
        porcentaje: totalIngresos > 0 ? (resultadoNeto / totalIngresos) * 100 : 0,
      },
      comparacion: comparar
        ? {
            ingresos: {
              anterior: totalIngresosAnterior,
              variacion: totalIngresosAnterior > 0 ? ((totalIngresos - totalIngresosAnterior) / totalIngresosAnterior) * 100 : 0,
            },
            margenBruto: {
              anterior: margenBrutoAnterior,
              variacion: margenBrutoAnterior > 0 ? ((margenBruto - margenBrutoAnterior) / margenBrutoAnterior) * 100 : 0,
            },
            ebitda: {
              anterior: ebitdaAnterior,
              variacion: ebitdaAnterior !== 0 ? ((ebitda - ebitdaAnterior) / Math.abs(ebitdaAnterior)) * 100 : 0,
            },
            resultadoNeto: {
              anterior: resultadoNetoAnterior,
              variacion: resultadoNetoAnterior !== 0 ? ((resultadoNeto - resultadoNetoAnterior) / Math.abs(resultadoNetoAnterior)) * 100 : 0,
            },
          }
        : null,
    });
  } catch (err: unknown) {
    console.error("Error calculando estado de resultados:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
