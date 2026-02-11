import { z } from "zod";
import type { ToolMetadata } from "../tool-registry";

export const sistemaTools: ToolMetadata[] = [
  {
    name: "getSystemInfo",
    description: "Obtener información general del sistema: módulos disponibles, versión, estado",
    module: "sistema",
    allowedRoles: ["ADMIN", "OPERADOR", "CONTADOR", "RRHH_MANAGER", "COMERCIAL", "CLIENTE", "VIEWER"],
    inputSchema: z.object({}),
    execute: async () => {
      return {
        nombre: "MotoLibre ERP",
        version: "2.0.0",
        modulos: [
          { nombre: "Flota", descripcion: "Gestión de motos, mantenimientos y repuestos", activo: true },
          { nombre: "Comercial", descripcion: "Clientes, contratos, pagos y facturación", activo: true },
          { nombre: "Finanzas", descripcion: "Análisis de rentabilidad y pricing", activo: true },
          { nombre: "Contabilidad", descripcion: "Plan de cuentas, asientos e IVA", activo: true },
          { nombre: "RRHH", descripcion: "Gestión de personal y liquidaciones", activo: true },
        ],
        ubicacion: "Buenos Aires, Argentina",
      };
    },
  },
];
