import { prisma } from "@/lib/prisma";

/**
 * Máquina de estados de contratos.
 * Terminal: FINALIZADO, CANCELADO, FINALIZADO_COMPRA.
 */
const CONTRACT_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ["ACTIVO", "CANCELADO"],
  ACTIVO:    ["FINALIZADO", "CANCELADO", "FINALIZADO_COMPRA"],
  FINALIZADO: [],
  CANCELADO:  [],
  FINALIZADO_COMPRA: [],
};

export class ContractStateMachine {

  static validateTransition(from: string, to: string): void {
    const allowed = CONTRACT_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(`Transición de contrato inválida: ${from} → ${to}`);
    }
  }

  static isTerminal(estado: string): boolean {
    const transitions = CONTRACT_TRANSITIONS[estado];
    return transitions !== undefined && transitions.length === 0;
  }

  static getAllowedTransitions(estado: string): string[] {
    return CONTRACT_TRANSITIONS[estado] ?? [];
  }

  /**
   * Verifica si un contrato puede ser activado (PENDIENTE → ACTIVO).
   * Valida reglas de negocio adicionales.
   */
  static async canActivate(contratoId: string): Promise<{ valid: boolean; reason?: string }> {
    const contrato = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: {
        cliente: true,
        moto: true,
      },
    });

    if (!contrato) {
      return { valid: false, reason: "Contrato no encontrado" };
    }
    if (contrato.estado !== "PENDIENTE") {
      return { valid: false, reason: "Solo contratos PENDIENTE pueden activarse" };
    }
    if (contrato.cliente.estado !== "APROBADO") {
      return { valid: false, reason: "El cliente no está aprobado" };
    }
    if (contrato.moto.estado !== "DISPONIBLE") {
      return { valid: false, reason: "La moto no está disponible" };
    }

    return { valid: true };
  }
}
