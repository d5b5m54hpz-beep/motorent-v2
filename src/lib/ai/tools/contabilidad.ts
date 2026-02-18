import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolMetadata } from "../tool-registry";

export const contabilidadTools: ToolMetadata[] = [
  {
    name: "getFacturasCompraPendientes",
    description: "Obtener facturas de compra sin pagar, vencidas y monto total adeudado",
    module: "contabilidad",
    allowedRoles: ["ADMIN", "CONTADOR", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      const [pendientes, vencidas, adeudadoTotal] = await Promise.all([
        prisma.facturaCompra.count({
          where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
        }),
        prisma.facturaCompra.count({
          where: {
            estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] },
            vencimiento: { lt: now },
          },
        }),
        prisma.facturaCompra.aggregate({
          where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
          _sum: { total: true },
        }),
      ]);

      const detalle = await prisma.facturaCompra.findMany({
        where: { estado: { in: ["PENDIENTE", "PAGADA_PARCIAL"] } },
        select: {
          razonSocial: true,
          tipo: true,
          numero: true,
          total: true,
          montoAbonado: true,
          vencimiento: true,
        },
        orderBy: { vencimiento: "asc" },
        take: 10,
      });

      return {
        pendientes,
        vencidas,
        adeudadoTotal: Math.round(Number(adeudadoTotal._sum.total ?? 0)),
        detalle: detalle.map((f) => ({
          proveedor: f.razonSocial,
          factura: `${f.tipo} ${f.numero}`,
          total: Math.round(Number(f.total)),
          adeudado: Math.round(Number(f.total) - Number(f.montoAbonado)),
          vencimiento: f.vencimiento?.toLocaleDateString("es-AR") ?? "Sin vencimiento",
          vencida: f.vencimiento ? f.vencimiento < now : false,
        })),
      };
    },
  },
  {
    name: "getPosicionIVA",
    description: "Obtener posición de IVA del período: crédito fiscal (compras) vs débito fiscal (ventas)",
    module: "contabilidad",
    allowedRoles: ["ADMIN", "CONTADOR"],
    inputSchema: z.object({
      periodo: z.enum(["mes_actual", "ultimo_trimestre", "ultimo_anio"]).describe("Período a analizar"),
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

      // IVA Crédito Fiscal (compras) - cuenta 1.1.04
      const ivaCredito = await prisma.lineaAsiento.aggregate({
        where: {
          cuenta: { codigo: "1.1.04" },
          asiento: { fecha: { gte: desde, lte: now } },
        },
        _sum: { debe: true, haber: true },
      });

      // IVA Débito Fiscal (ventas) - cuenta 2.1.02.001
      const ivaDebito = await prisma.lineaAsiento.aggregate({
        where: {
          cuenta: { codigo: "2.1.02.001" },
          asiento: { fecha: { gte: desde, lte: now } },
        },
        _sum: { debe: true, haber: true },
      });

      const credito = Number(ivaCredito._sum.debe ?? 0) - Number(ivaCredito._sum.haber ?? 0);
      const debito = Number(ivaDebito._sum.haber ?? 0) - Number(ivaDebito._sum.debe ?? 0);
      const saldo = debito - credito;

      return {
        periodo,
        ivaCredito: Math.round(credito),
        ivaDebito: Math.round(debito),
        saldo: Math.round(saldo),
        tipo: saldo > 0 ? "A PAGAR" : saldo < 0 ? "A FAVOR" : "NEUTRAL",
      };
    },
  },
  {
    name: "getTopProveedores",
    description: "Obtener ranking de proveedores por monto facturado en el período",
    module: "contabilidad",
    allowedRoles: ["ADMIN", "CONTADOR", "OPERADOR", "VIEWER"],
    inputSchema: z.object({
      periodo: z.enum(["mes_actual", "ultimo_trimestre", "ultimo_anio"]).describe("Período a analizar"),
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

      const facturas = await prisma.facturaCompra.groupBy({
        by: ["razonSocial"],
        where: { fecha: { gte: desde, lte: now } },
        _sum: { total: true },
        _count: { id: true },
      });

      const sorted = facturas.sort((a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0)).slice(0, 10);

      return {
        periodo,
        topProveedores: sorted.map((f, idx) => ({
          ranking: idx + 1,
          proveedor: f.razonSocial,
          montoTotal: Math.round(Number(f._sum.total ?? 0)),
          cantidadFacturas: f._count.id,
        })),
      };
    },
  },
];
