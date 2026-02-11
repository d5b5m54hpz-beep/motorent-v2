import { CoreTool } from "ai";
import { z } from "zod";

export type UserRole = "ADMIN" | "OPERADOR" | "CLIENTE" | "CONTADOR" | "RRHH_MANAGER" | "COMERCIAL" | "VIEWER";

export type ToolModule = "flota" | "comercial" | "finanzas" | "contabilidad" | "rrhh" | "sistema";

export interface ToolMetadata {
  name: string;
  description: string;
  module: ToolModule;
  allowedRoles: UserRole[];
  inputSchema: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
}

class ToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();

  register(metadata: ToolMetadata) {
    this.tools.set(metadata.name, metadata);
  }

  registerMultiple(tools: ToolMetadata[]) {
    tools.forEach((tool) => this.register(tool));
  }

  getToolsForRole(role: UserRole): Map<string, CoreTool> {
    const filtered = new Map<string, CoreTool>();

    for (const [name, metadata] of this.tools.entries()) {
      if (metadata.allowedRoles.includes(role)) {
        filtered.set(name, {
          description: metadata.description,
          parameters: metadata.inputSchema,
          execute: metadata.execute,
        });
      }
    }

    return filtered;
  }

  getModulesForRole(role: UserRole): ToolModule[] {
    const modules = new Set<ToolModule>();

    for (const metadata of this.tools.values()) {
      if (metadata.allowedRoles.includes(role)) {
        modules.add(metadata.module);
      }
    }

    return Array.from(modules);
  }

  getAllTools(): Map<string, ToolMetadata> {
    return new Map(this.tools);
  }

  getToolsByModule(module: ToolModule): ToolMetadata[] {
    return Array.from(this.tools.values()).filter((tool) => tool.module === module);
  }
}

export const toolRegistry = new ToolRegistry();

// Helper to get system prompt based on role
export function getSystemPromptForRole(role: UserRole, modules: ToolModule[]): string {
  const basePrompt = `Sos el asistente de inteligencia artificial de MotoLibre, un sistema ERP de alquiler de motos en Buenos Aires, Argentina.
Tenés acceso a datos en tiempo real del negocio. Respondé siempre en español argentino.
Sé conciso, profesional y usá datos concretos cuando los tengas.
Cuando te pregunten algo que requiera datos, usá las herramientas disponibles para consultar la base de datos.
Formateá montos en pesos argentinos (ej: $150.000) y fechas en formato dd/mm/yyyy.
Usá markdown para formatear las respuestas cuando sea útil (tablas, listas, negrita).
Si no tenés datos suficientes para responder, indicalo claramente.`;

  const roleDescriptions: Record<UserRole, string> = {
    ADMIN: "Tenés acceso completo a todos los módulos del sistema: flota, comercial, finanzas, contabilidad y RRHH.",
    OPERADOR: "Tenés acceso a operaciones diarias: flota, mantenimiento, contratos y pagos.",
    CONTADOR: "Te enfocás en contabilidad y finanzas: asientos contables, facturas de compra, IVA y reportes financieros.",
    RRHH_MANAGER: "Gestionás recursos humanos: empleados, asistencias, liquidaciones y costos laborales.",
    COMERCIAL: "Te enfocás en clientes, contratos, pagos y análisis de rentabilidad comercial.",
    CLIENTE: "Podés consultar tus contratos activos, pagos pendientes y facturas.",
    VIEWER: "Tenés acceso de solo lectura a reportes y consultas básicas.",
  };

  const moduleDescriptions: Record<ToolModule, string> = {
    flota: "Gestión de motos, mantenimientos, repuestos y alertas técnicas",
    comercial: "Clientes, contratos, pagos y facturación",
    finanzas: "Análisis de rentabilidad, pricing y reportes financieros",
    contabilidad: "Plan de cuentas, asientos contables, facturas de compra e IVA",
    rrhh: "Empleados, asistencias, liquidaciones y costos laborales",
    sistema: "Consultas generales y búsquedas",
  };

  let prompt = basePrompt + "\n\n";
  prompt += roleDescriptions[role] + "\n\n";
  prompt += "Módulos disponibles:\n";
  modules.forEach((mod) => {
    prompt += `- ${mod.toUpperCase()}: ${moduleDescriptions[mod]}\n`;
  });

  return prompt;
}
