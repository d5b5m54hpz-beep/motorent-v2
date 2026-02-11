import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolMetadata } from "../tool-registry";

export const comercialTools: ToolMetadata[] = [
  {
    name: "getClientsSummary",
    description: "Obtener resumen de clientes: total, activos con contrato, con pagos pendientes",
    module: "comercial",
    allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const [total, conContrato, conPagosPendientes] = await Promise.all([
        prisma.cliente.count({ where: { estado: "aprobado" } }),
        prisma.cliente.count({
          where: { estado: "aprobado", contratos: { some: { estado: "activo" } } },
        }),
        prisma.pago.findMany({
          where: { estado: "pendiente" },
          select: {
            monto: true,
            vencimientoAt: true,
            contrato: {
              select: { cliente: { select: { nombre: true, email: true } } },
            },
          },
          take: 10,
          orderBy: { vencimientoAt: "asc" },
        }),
      ]);

      return {
        totalAprobados: total,
        conContratoActivo: conContrato,
        pagosPendientes: conPagosPendientes.map((p) => ({
          cliente: p.contrato.cliente.nombre ?? p.contrato.cliente.email,
          monto: p.monto,
          vencimiento: p.vencimientoAt?.toLocaleDateString("es-AR") ?? "Sin vencimiento",
        })),
      };
    },
  },
  {
    name: "getContractsSummary",
    description: "Obtener resumen de contratos: activos, por vencer, vencidos, monto total",
    module: "comercial",
    allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      const en7dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [activos, porVencer, vencidos, montoTotal] = await Promise.all([
        prisma.contrato.count({ where: { estado: "activo" } }),
        prisma.contrato.count({
          where: { estado: "activo", fechaFin: { gte: now, lte: en7dias } },
        }),
        prisma.contrato.count({
          where: { estado: "activo", fechaFin: { lt: now } },
        }),
        prisma.contrato.aggregate({
          where: { estado: "activo" },
          _sum: { montoTotal: true },
        }),
      ]);

      return {
        activos,
        porVencerEn7Dias: porVencer,
        vencidos,
        montoTotalActivos: Math.round(montoTotal._sum.montoTotal ?? 0),
      };
    },
  },
];
