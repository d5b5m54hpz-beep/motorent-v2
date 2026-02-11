import { toolRegistry } from "./tool-registry";
import { flotaTools } from "./tools/flota";
import { comercialTools } from "./tools/comercial";
import { finanzasTools } from "./tools/finanzas";
import { contabilidadTools } from "./tools/contabilidad";
import { rrhhTools } from "./tools/rrhh";
import { sistemaTools } from "./tools/sistema";

// Auto-register all tools on import
toolRegistry.registerMultiple([
  ...flotaTools,
  ...comercialTools,
  ...finanzasTools,
  ...contabilidadTools,
  ...rrhhTools,
  ...sistemaTools,
]);

export { toolRegistry } from "./tool-registry";
export { getSystemPromptForRole } from "./tool-registry";
export type { UserRole, ToolModule, ToolMetadata } from "./tool-registry";
