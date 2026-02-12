import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolMetadata } from "../tool-registry";

export const flotaTools: ToolMetadata[] = [
  {
    name: "getFleetSummary",
    description: "Obtener resumen de la flota de motos: total, por estado, ocupación",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const motos = await prisma.moto.groupBy({
        by: ["estado"],
        _count: { id: true },
      });
      const total = motos.reduce((s, m) => s + m._count.id, 0);
      const byEstado = Object.fromEntries(motos.map((m) => [m.estado, m._count.id]));
      const alquiladas = byEstado["alquilada"] ?? 0;
      return {
        total,
        disponibles: byEstado["disponible"] ?? 0,
        alquiladas,
        enMantenimiento: byEstado["mantenimiento"] ?? 0,
        deBaja: byEstado["baja"] ?? 0,
        ocupacion: total > 0 ? Math.round((alquiladas / total) * 100) : 0,
      };
    },
  },
  {
    name: "searchMoto",
    description: "Buscar una moto específica por patente, marca o modelo y obtener sus datos completos",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "COMERCIAL", "VIEWER"],
    inputSchema: z.object({
      query: z.string().describe("Patente, marca o modelo a buscar"),
    }),
    execute: async ({ query }) => {
      const moto = await prisma.moto.findFirst({
        where: {
          OR: [
            { patente: { contains: query, mode: "insensitive" } },
            { marca: { contains: query, mode: "insensitive" } },
            { modelo: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          contratos: {
            where: { estado: "activo" },
            include: { cliente: { select: { nombre: true, email: true } } },
            take: 3,
          },
          mantenimientos: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { tipo: true, estado: true, costoTotal: true, createdAt: true },
          },
        },
      });

      if (!moto) return { encontrada: false, mensaje: `No se encontró moto con "${query}"` };

      return {
        encontrada: true,
        id: moto.id,
        marca: moto.marca,
        modelo: moto.modelo,
        patente: moto.patente,
        anio: moto.anio,
        kilometraje: moto.kilometraje,
        precioMensual: moto.precioMensual,
        estado: moto.estado,
        contratosActivos: moto.contratos.map((c) => ({
          cliente: c.cliente.nombre ?? c.cliente.email,
          fechaFin: c.fechaFin.toLocaleDateString("es-AR"),
          monto: c.montoTotal,
        })),
        ultimosMantenimientos: moto.mantenimientos.map((m) => ({
          tipo: m.tipo,
          estado: m.estado,
          costo: m.costoTotal,
          fecha: m.createdAt.toLocaleDateString("es-AR"),
        })),
      };
    },
  },
  {
    name: "getMaintenanceAlerts",
    description: "Obtener alertas de mantenimiento: pendientes, en proceso hace más de 7 días, repuestos con stock bajo",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [pendientes, enProcesoLargo] = await Promise.all([
        prisma.mantenimiento.findMany({
          where: { estado: { in: ["PENDIENTE", "PROGRAMADO"] } },
          select: {
            id: true,
            tipo: true,
            descripcion: true,
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
          take: 10,
        }),
        prisma.mantenimiento.findMany({
          where: { estado: "EN_PROCESO", fechaInicio: { lte: hace7dias } },
          select: {
            id: true,
            tipo: true,
            descripcion: true,
            fechaInicio: true,
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
          take: 10,
        }),
      ]);

      // Fetch repuestos with stock bajo using raw query
      const repuestosBajo = await prisma.$queryRaw<Array<{ nombre: string; stock: number; stockMinimo: number }>>`
        SELECT nombre, stock, "stockMinimo" FROM "Repuesto" WHERE stock <= "stockMinimo" LIMIT 10
      `;

      return {
        mantenimientosPendientes: pendientes.map((m) => ({
          moto: `${m.moto.marca} ${m.moto.modelo} (${m.moto.patente})`,
          tipo: m.tipo,
          descripcion: m.descripcion,
        })),
        enProcesoMasDe7Dias: enProcesoLargo.map((m) => ({
          moto: `${m.moto.marca} ${m.moto.modelo} (${m.moto.patente})`,
          tipo: m.tipo,
          dias: Math.ceil((Date.now() - new Date(m.fechaInicio!).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        repuestosStockBajo: repuestosBajo.map((r) => ({
          nombre: r.nombre,
          stock: r.stock,
          minimo: r.stockMinimo,
        })),
      };
    },
  },
  {
    name: "getFlotaSummary",
    description: "Resumen completo de la flota: total, por estado, ocupación, valor de inventario, depreciación acumulada",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "CONTADOR", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const [motos, valorTotal] = await Promise.all([
        prisma.moto.groupBy({
          by: ["estado"],
          _count: { id: true },
        }),
        prisma.moto.aggregate({
          _sum: { valorCompra: true, valorResidual: true },
        }),
      ]);

      const total = motos.reduce((s, m) => s + m._count.id, 0);
      const byEstado = Object.fromEntries(motos.map((m) => [m.estado, m._count.id]));
      const alquiladas = byEstado["alquilada"] ?? 0;

      // Calcular depreciación (simplified)
      const valorCompraTotal = valorTotal._sum.valorCompra ?? 0;
      const valorResidualTotal = valorTotal._sum.valorResidual ?? 0;

      return {
        total,
        disponibles: byEstado["disponible"] ?? 0,
        alquiladas,
        enMantenimiento: byEstado["mantenimiento"] ?? 0,
        deBaja: byEstado["baja"] ?? 0,
        ocupacion: total > 0 ? Math.round((alquiladas / total) * 100) : 0,
        valorCompraTotal,
        valorResidualTotal,
        depreciacionTotal: valorCompraTotal - valorResidualTotal,
      };
    },
  },
  {
    name: "getMotosProximoMantenimiento",
    description: "Obtener motos que necesitan mantenimiento próximamente (por kilometraje o fechas)",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "VIEWER"],
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe("Cantidad máxima de resultados"),
    }),
    execute: async ({ limit }) => {
      // Motos con alto kilometraje (>20000 km) que podrían necesitar service
      const motosAltoKm = await prisma.moto.findMany({
        where: {
          kilometraje: { gte: 20000 },
          estado: { in: ["disponible", "alquilada"] },
        },
        orderBy: { kilometraje: "desc" },
        take: limit,
        select: {
          id: true,
          marca: true,
          modelo: true,
          patente: true,
          kilometraje: true,
          estado: true,
          mantenimientos: {
            where: { estado: { in: ["COMPLETADO"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, tipo: true },
          },
        },
      });

      return {
        motosAltoKilometraje: motosAltoKm.map((m) => ({
          moto: `${m.marca} ${m.modelo} (${m.patente})`,
          kilometraje: m.kilometraje,
          estado: m.estado,
          ultimoMantenimiento: m.mantenimientos[0]
            ? {
                tipo: m.mantenimientos[0].tipo,
                fecha: m.mantenimientos[0].createdAt.toLocaleDateString("es-AR"),
              }
            : null,
        })),
      };
    },
  },
  {
    name: "getDepreciacionFlota",
    description: "Obtener depreciación acumulada de la flota con detalle por moto",
    module: "flota",
    allowedRoles: ["ADMIN", "CONTADOR", "VIEWER"],
    inputSchema: z.object({
      limit: z.number().optional().default(20).describe("Cantidad máxima de motos a retornar"),
    }),
    execute: async ({ limit }) => {
      const motos = await prisma.moto.findMany({
        where: {
          valorCompra: { not: null },
          fechaCompra: { not: null },
        },
        select: {
          id: true,
          marca: true,
          modelo: true,
          patente: true,
          valorCompra: true,
          valorResidual: true,
          fechaCompra: true,
          vidaUtilAnios: true,
        },
        orderBy: { valorCompra: "desc" },
        take: limit,
      });

      const ahora = new Date();

      const detalle = motos.map((m) => {
        const valorCompra = m.valorCompra ?? 0;
        const valorResidual = m.valorResidual ?? 0;
        const vidaUtilMeses = (m.vidaUtilAnios ?? 5) * 12;
        const cuotaMensual = (valorCompra - valorResidual) / vidaUtilMeses;

        const fechaInicio = m.fechaCompra ? new Date(m.fechaCompra) : ahora;
        const mesesTranscurridos = Math.max(
          0,
          Math.floor((ahora.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24 * 30))
        );

        const amortizacionAcumulada = Math.min(
          cuotaMensual * mesesTranscurridos,
          valorCompra - valorResidual
        );

        const valorLibros = valorCompra - amortizacionAcumulada;

        return {
          moto: `${m.marca} ${m.modelo} (${m.patente})`,
          valorCompra,
          valorResidual,
          amortizacionAcumulada: Math.round(amortizacionAcumulada),
          valorLibros: Math.round(valorLibros),
          mesesTranscurridos,
          vidaUtilMeses,
        };
      });

      const totalValorCompra = detalle.reduce((s, m) => s + m.valorCompra, 0);
      const totalAmortizacion = detalle.reduce((s, m) => s + m.amortizacionAcumulada, 0);
      const totalValorLibros = detalle.reduce((s, m) => s + m.valorLibros, 0);

      return {
        resumen: {
          totalValorCompra: Math.round(totalValorCompra),
          totalAmortizacionAcumulada: Math.round(totalAmortizacion),
          totalValorLibros: Math.round(totalValorLibros),
        },
        detalle,
      };
    },
  },
  {
    name: "getPatentamientoPendiente",
    description: "Obtener motos con patentamiento pendiente o en proceso",
    module: "flota",
    allowedRoles: ["ADMIN", "OPERADOR", "VIEWER"],
    inputSchema: z.object({
      soloImportadas: z.boolean().optional().default(false).describe("Filtrar solo motos importadas"),
    }),
    execute: async ({ soloImportadas }) => {
      const where: any = {
        estadoPatentamiento: { not: "COMPLETADO" },
      };

      if (soloImportadas) {
        where.esImportada = true;
      }

      const motos = await prisma.moto.findMany({
        where,
        select: {
          id: true,
          marca: true,
          modelo: true,
          patente: true,
          vin: true,
          dominio: true,
          estadoPatentamiento: true,
          esImportada: true,
          fechaImportacion: true,
          documentos: {
            select: {
              tipo: true,
              completado: true,
            },
          },
        },
        orderBy: [{ estadoPatentamiento: "asc" }, { createdAt: "desc" }],
      });

      const porEstado = {
        NO_INICIADO: motos.filter((m) => m.estadoPatentamiento === "NO_INICIADO"),
        IMPORTADA: motos.filter((m) => m.estadoPatentamiento === "IMPORTADA"),
        EN_VERIFICACION: motos.filter((m) => m.estadoPatentamiento === "EN_VERIFICACION"),
        DOCUMENTACION_LISTA: motos.filter((m) => m.estadoPatentamiento === "DOCUMENTACION_LISTA"),
        EN_RUNA: motos.filter((m) => m.estadoPatentamiento === "EN_RUNA"),
        PATENTADA: motos.filter((m) => m.estadoPatentamiento === "PATENTADA"),
      };

      return {
        total: motos.length,
        porEstado: Object.fromEntries(
          Object.entries(porEstado).map(([estado, items]) => [estado, items.length])
        ),
        detalle: motos.map((m) => ({
          moto: `${m.marca} ${m.modelo} (${m.patente || m.vin || "S/N"})`,
          dominio: m.dominio,
          estado: m.estadoPatentamiento,
          esImportada: m.esImportada,
          documentosCompletados: m.documentos.filter((d) => d.completado).length,
          totalDocumentos: m.documentos.length,
          progreso:
            m.documentos.length > 0
              ? Math.round((m.documentos.filter((d) => d.completado).length / m.documentos.length) * 100)
              : 0,
        })),
      };
    },
  },
];
