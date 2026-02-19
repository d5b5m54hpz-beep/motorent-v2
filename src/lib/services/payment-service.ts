import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";
import { OPERATIONS } from "@/lib/events/operations";
import { MetodoPago } from "@prisma/client";

/**
 * Máquina de estados de pagos.
 * Terminal: APROBADO (solo reembolso vía nota de crédito), CANCELADO, REEMBOLSADO.
 */
const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  PENDIENTE: ["APROBADO", "RECHAZADO", "CANCELADO", "VENCIDO"],
  APROBADO:  ["REEMBOLSADO"],
  RECHAZADO: ["PENDIENTE", "CANCELADO"],
  VENCIDO:   ["APROBADO", "PENDIENTE", "CANCELADO"],
  REEMBOLSADO: [],
  CANCELADO:   [],
};

/**
 * PaymentService — Punto único de verdad para todas las transiciones de pagos.
 * Encapsula la state machine, DB updates y event emission.
 */
export class PaymentService {

  static validateTransition(from: string, to: string): void {
    const allowed = PAYMENT_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
      throw new Error(`Transición de pago inválida: ${from} → ${to}`);
    }
  }

  static isTerminal(estado: string): boolean {
    const transitions = PAYMENT_TRANSITIONS[estado];
    return transitions !== undefined && transitions.length === 0;
  }

  static getAllowedTransitions(estado: string): string[] {
    return PAYMENT_TRANSITIONS[estado] ?? [];
  }

  /**
   * Aprobar un pago y disparar side effects vía EventBus.
   */
  static async approve(pagoId: string, data: {
    metodo: string;
    mpPaymentId?: string;
    comprobante?: string;
    notas?: string;
    userId: string | undefined;
  }) {
    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    this.validateTransition(pago.estado, "APROBADO");

    const updated = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "APROBADO",
        metodo: data.metodo as MetodoPago,
        mpPaymentId: data.mpPaymentId ?? pago.mpPaymentId,
        comprobante: data.comprobante ?? pago.comprobante,
        notas: data.notas ?? pago.notas,
        pagadoAt: new Date(),
      },
      include: {
        contrato: {
          include: {
            cliente: { select: { nombre: true, email: true, dni: true } },
            moto: { select: { marca: true, modelo: true, patente: true } },
          },
        },
      },
    });

    eventBus.emit(
      OPERATIONS.payment.approve,
      "Pago",
      pagoId,
      {
        previousEstado: pago.estado,
        newEstado: "APROBADO",
        monto: updated.monto,
        metodo: updated.metodo,
        contratoId: updated.contratoId,
      },
      data.userId
    ).catch((err) => console.error("[PaymentService] approve event error:", err));

    return updated;
  }

  /**
   * Rechazar un pago.
   */
  static async reject(pagoId: string, data: { notas?: string; userId: string | undefined }) {
    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    this.validateTransition(pago.estado, "RECHAZADO");

    const updated = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "RECHAZADO",
        notas: data.notas ?? pago.notas,
      },
    });

    eventBus.emit(
      OPERATIONS.payment.reject,
      "Pago",
      pagoId,
      {
        previousEstado: pago.estado,
        newEstado: "RECHAZADO",
        monto: updated.monto,
        contratoId: updated.contratoId,
      },
      data.userId
    ).catch((err) => console.error("[PaymentService] reject event error:", err));

    return updated;
  }

  /**
   * Cancelar un pago.
   */
  static async cancel(pagoId: string, data: { notas?: string; userId: string | undefined }) {
    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    this.validateTransition(pago.estado, "CANCELADO");

    const updated = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "CANCELADO",
        notas: data.notas ?? pago.notas,
      },
    });

    eventBus.emit(
      OPERATIONS.payment.reject,
      "Pago",
      pagoId,
      {
        previousEstado: pago.estado,
        newEstado: "CANCELADO",
        monto: updated.monto,
        contratoId: updated.contratoId,
      },
      data.userId
    ).catch((err) => console.error("[PaymentService] cancel event error:", err));

    return updated;
  }

  /**
   * Reembolsar un pago (solo ADMIN, requiere nota de crédito).
   */
  static async refund(pagoId: string, data: { notas?: string; userId: string | undefined }) {
    const pago = await prisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    this.validateTransition(pago.estado, "REEMBOLSADO");

    const updated = await prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "REEMBOLSADO",
        notas: data.notas ?? pago.notas,
      },
    });

    eventBus.emit(
      OPERATIONS.payment.refund,
      "Pago",
      pagoId,
      {
        previousEstado: pago.estado,
        newEstado: "REEMBOLSADO",
        monto: updated.monto,
        contratoId: updated.contratoId,
      },
      data.userId
    ).catch((err) => console.error("[PaymentService] refund event error:", err));

    return updated;
  }

  /**
   * Procesar notificación de MercadoPago.
   * Idempotente: si el estado ya es el correcto, retorna sin error.
   */
  static async processWebhook(mpPaymentId: string, mpStatus: string, externalRef?: string) {
    const nuevoEstado = this.mapMPStatus(mpStatus);
    if (!nuevoEstado) {
      return { processed: false, reason: "unknown_mp_status" };
    }

    // Buscar por external_reference (nuestro pagoId) o por mpPaymentId
    const where = externalRef
      ? { id: externalRef }
      : { mpPaymentId: String(mpPaymentId) };

    const pago = await prisma.pago.findFirst({ where });

    if (!pago) {
      console.warn(`[PaymentService] Webhook MP: pago no encontrado mpPaymentId=${mpPaymentId}`);
      return { processed: false, reason: "pago_not_found" };
    }

    // Idempotencia: ya está en ese estado
    if (pago.estado === nuevoEstado && pago.mpPaymentId === String(mpPaymentId)) {
      return { processed: false, reason: "already_processed" };
    }

    // No procesar si está en estado terminal
    if (this.isTerminal(pago.estado)) {
      return { processed: false, reason: "terminal_state" };
    }

    // Verificar si la transición es posible
    const allowed = PAYMENT_TRANSITIONS[pago.estado] ?? [];
    if (!allowed.includes(nuevoEstado)) {
      return { processed: false, reason: `invalid_transition_${pago.estado}_to_${nuevoEstado}` };
    }

    switch (nuevoEstado) {
      case "APROBADO":
        await this.approve(pago.id, {
          metodo: "MERCADOPAGO",
          mpPaymentId: String(mpPaymentId),
          userId: "system-webhook",
        });
        break;
      case "RECHAZADO":
        await this.reject(pago.id, { userId: "system-webhook" });
        break;
      case "CANCELADO":
        await this.cancel(pago.id, { userId: "system-webhook" });
        break;
    }

    return { processed: true, estado: nuevoEstado };
  }

  /**
   * Mapa de estados MercadoPago → estados internos.
   */
  static mapMPStatus(mpStatus: string): string | null {
    const map: Record<string, string> = {
      approved:   "APROBADO",
      rejected:   "RECHAZADO",
      pending:    "PENDIENTE",
      cancelled:  "CANCELADO",
      refunded:   "REEMBOLSADO",
      in_process: "PENDIENTE",
    };
    return map[mpStatus] ?? null;
  }
}
