import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { EstadoMoto } from "@prisma/client";
import type { ToolMetadata } from "../tool-registry";

export const finanzasTools: ToolMetadata[] = [
  {
    name: "getFinancialSummary",
    description: "Obtener resumen financiero: ingresos, gastos, resultado neto, top categorías de gasto",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "VIEWER"],
    inputSchema: z.object({
      periodo: z.enum(["mes_actual", "ultimo_trimestre", "ultimo_anio"]).describe("Período a consultar"),
    }),
    execute: async ({ periodo }) => {
      const now = new Date();
      let desde: Date;
      if (periodo === "mes_actual") {
        desde = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (periodo === "ultimo_trimestre") {
        desde = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      } else {
        desde = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      }

      const [ingresos, gastos, topCategorias] = await Promise.all([
        prisma.pago.aggregate({
          where: { estado: "APROBADO", pagadoAt: { gte: desde } },
          _sum: { monto: true },
          _count: { id: true },
        }),
        prisma.gasto.aggregate({
          where: { fecha: { gte: desde } },
          _sum: { monto: true },
          _count: { id: true },
        }),
        prisma.gasto.groupBy({
          by: ["categoria"],
          where: { fecha: { gte: desde } },
          _sum: { monto: true },
          orderBy: { _sum: { monto: "desc" } },
          take: 5,
        }),
      ]);

      const ing = Number(ingresos._sum.monto ?? 0);
      const gas = Number(gastos._sum.monto ?? 0);
      return {
        periodo,
        ingresos: Math.round(ing),
        cantidadPagos: ingresos._count.id,
        gastos: Math.round(gas),
        cantidadGastos: gastos._count.id,
        resultadoNeto: Math.round(ing - gas),
        topCategorias: topCategorias.map((c) => ({
          categoria: c.categoria,
          monto: Math.round(Number(c._sum.monto ?? 0)),
        })),
      };
    },
  },
  {
    name: "getMotoProfitability",
    description: "Obtener rentabilidad por moto: ingresos, gastos, rentabilidad neta, costo por km",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({
      motoId: z.string().optional().describe("ID de moto específica, o vacío para todas"),
    }),
    execute: async ({ motoId }) => {
      const where = motoId ? { id: motoId } : { estado: { not: "BAJA" as EstadoMoto } };
      const motos = await prisma.moto.findMany({
        where,
        select: { id: true, marca: true, modelo: true, patente: true, kilometraje: true, precioMensual: true },
        take: 20,
      });

      const result = await Promise.all(
        motos.map(async (moto) => {
          const ingresos = await prisma.pago.aggregate({
            where: { estado: "APROBADO", contrato: { motoId: moto.id } },
            _sum: { monto: true },
          });
          const gastos = await prisma.gasto.aggregate({
            where: { motoId: moto.id },
            _sum: { monto: true },
          });
          const ing = Number(ingresos._sum.monto ?? 0);
          const gas = Number(gastos._sum.monto ?? 0);
          return {
            moto: `${moto.marca} ${moto.modelo} (${moto.patente})`,
            ingresos: Math.round(ing),
            gastos: Math.round(gas),
            rentabilidad: Math.round(ing - gas),
            costoPorKm: moto.kilometraje > 0 ? Math.round(gas / moto.kilometraje) : 0,
            precioMensual: moto.precioMensual,
          };
        })
      );
      return result.sort((a, b) => b.rentabilidad - a.rentabilidad);
    },
  },
  {
    name: "getPricingSuggestion",
    description: "Obtener sugerencia de pricing basada en costos operativos y margen deseado",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "COMERCIAL"],
    inputSchema: z.object({
      margen: z.number().min(10).max(50).default(30).describe("Margen deseado en porcentaje"),
    }),
    execute: async ({ margen }) => {
      const motos = await prisma.moto.findMany({
        where: { estado: { not: "BAJA" as EstadoMoto } },
        select: { id: true, marca: true, modelo: true, patente: true, precioMensual: true, createdAt: true },
      });

      const now = new Date();
      const hace6m = new Date(now.getFullYear(), now.getMonth() - 6, 1);

      const result = await Promise.all(
        motos.map(async (moto) => {
          const gastos = await prisma.gasto.aggregate({
            where: { motoId: moto.id, fecha: { gte: hace6m } },
            _sum: { monto: true },
          });
          const meses = Math.max(1, Math.min(6, (now.getTime() - moto.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          const costoMensual = Number(gastos._sum.monto ?? 0) / meses;
          const sugerido = costoMensual * (1 + margen / 100);
          const precioMensualNum = Number(moto.precioMensual);
          return {
            moto: `${moto.marca} ${moto.modelo} (${moto.patente})`,
            costoOperativoMensual: Math.round(costoMensual),
            precioActual: precioMensualNum,
            precioSugerido: Math.round(sugerido),
            diferencia: Math.round(precioMensualNum - sugerido),
            subpreciada: precioMensualNum < sugerido * 0.95,
          };
        })
      );

      const subpreciadas = result.filter((r) => r.subpreciada);
      return {
        margenDeseado: margen,
        totalMotos: result.length,
        motosSubpreciadas: subpreciadas.length,
        costoPromedioFlota:
          result.length > 0
            ? Math.round(result.reduce((s, r) => s + r.costoOperativoMensual, 0) / result.length)
            : 0,
        detalle: result.slice(0, 10),
      };
    },
  },
  {
    name: "getRevenueByPeriod",
    description: "Obtener ingresos agrupados por período para graficar tendencias",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({
      periodo: z.enum(["diario", "semanal", "mensual"]).describe("Granularidad del agrupamiento"),
    }),
    execute: async ({ periodo }) => {
      const now = new Date();
      let desde: Date;
      if (periodo === "diario") {
        desde = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (periodo === "semanal") {
        desde = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
      } else {
        desde = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      }

      const pagos = await prisma.pago.findMany({
        where: { estado: "APROBADO", pagadoAt: { gte: desde } },
        select: { monto: true, pagadoAt: true },
        orderBy: { pagadoAt: "asc" },
      });

      const grouped = new Map<string, number>();
      for (const p of pagos) {
        if (!p.pagadoAt) continue;
        const d = new Date(p.pagadoAt);
        let key: string;
        if (periodo === "diario") {
          key = d.toLocaleDateString("es-AR");
        } else if (periodo === "semanal") {
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          key = `Sem ${weekStart.toLocaleDateString("es-AR")}`;
        } else {
          key = d.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
        }
        grouped.set(key, (grouped.get(key) ?? 0) + Number(p.monto));
      }

      return Array.from(grouped.entries()).map(([fecha, monto]) => ({
        fecha,
        monto: Math.round(monto),
      }));
    },
  },
  {
    name: "getExpenseBreakdown",
    description: "Obtener desglose detallado de gastos por categoría o por moto",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "OPERADOR", "VIEWER"],
    inputSchema: z.object({
      categoria: z.string().optional().describe("Categoría de gasto a filtrar"),
      motoId: z.string().optional().describe("ID de moto para filtrar gastos"),
    }),
    execute: async ({ categoria, motoId }) => {
      const where: Record<string, unknown> = {};
      if (categoria) where.categoria = categoria;
      if (motoId) where.motoId = motoId;

      const gastos = await prisma.gasto.findMany({
        where,
        select: {
          concepto: true,
          monto: true,
          categoria: true,
          fecha: true,
          moto: { select: { marca: true, modelo: true, patente: true } },
        },
        orderBy: { fecha: "desc" },
        take: 20,
      });

      const total = gastos.reduce((s, g) => s + Number(g.monto), 0);

      return {
        totalGastos: Math.round(total),
        cantidad: gastos.length,
        detalle: gastos.map((g) => ({
          concepto: g.concepto,
          monto: Math.round(Number(g.monto)),
          categoria: g.categoria,
          fecha: g.fecha.toLocaleDateString("es-AR"),
          moto: g.moto ? `${g.moto.marca} ${g.moto.modelo} (${g.moto.patente})` : null,
        })),
      };
    },
  },
  {
    name: "getCostoOperativoMensual",
    description: "Obtener gastos operativos del mes agrupados por categoría",
    module: "finanzas",
    allowedRoles: ["ADMIN", "CONTADOR", "OPERADOR", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

      const gastosPorCategoria = await prisma.gasto.groupBy({
        by: ["categoria"],
        where: { fecha: { gte: primerDiaMes } },
        _sum: { monto: true },
        _count: { id: true },
      });

      const total = gastosPorCategoria.reduce((s, g) => s + Number(g._sum.monto ?? 0), 0);

      return {
        mes: now.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
        total: Math.round(total),
        porCategoria: gastosPorCategoria
          .map((g) => ({
            categoria: g.categoria,
            monto: Math.round(Number(g._sum.monto ?? 0)),
            cantidad: g._count.id,
          }))
          .sort((a, b) => b.monto - a.monto),
      };
    },
  },
];
