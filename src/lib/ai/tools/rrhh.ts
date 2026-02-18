import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolMetadata } from "../tool-registry";

export const rrhhTools: ToolMetadata[] = [
  {
    name: "getEmpleadosSummary",
    description: "Obtener resumen de empleados: activos, en licencia, bajas del mes, costo laboral mensual",
    module: "rrhh",
    allowedRoles: ["ADMIN", "RRHH_MANAGER", "CONTADOR", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);

      const [activos, enLicencia, bajasDelMes] = await Promise.all([
        prisma.empleado.count({ where: { estado: "ACTIVO" } }),
        prisma.empleado.count({ where: { estado: "LICENCIA" } }),
        prisma.empleado.count({
          where: {
            estado: "BAJA",
            fechaEgreso: { gte: primerDiaMes },
          },
        }),
      ]);

      // Calcular costo laboral del mes (suma de salarios básicos de activos)
      const empleadosActivos = await prisma.empleado.findMany({
        where: { estado: "ACTIVO" },
        select: { salarioBasico: true },
      });

      const costoLaboralMes = empleadosActivos.reduce((sum, e) => sum + Number(e.salarioBasico), 0);

      return {
        activos,
        enLicencia,
        bajasDelMes,
        costoLaboralMensual: Math.round(costoLaboralMes),
      };
    },
  },
  {
    name: "getAusenciasDelMes",
    description: "Obtener ausencias del mes actual agrupadas por tipo",
    module: "rrhh",
    allowedRoles: ["ADMIN", "RRHH_MANAGER", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date();
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
      const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const ausencias = await prisma.ausencia.groupBy({
        by: ["tipo"],
        where: {
          fechaInicio: {
            gte: primerDiaMes,
            lte: ultimoDiaMes,
          },
        },
        _count: { id: true },
      });

      return {
        mes: now.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
        ausenciasPorTipo: ausencias.map((a) => ({
          tipo: a.tipo,
          cantidad: a._count.id,
        })),
        total: ausencias.reduce((sum, a) => sum + a._count.id, 0),
      };
    },
  },
];
