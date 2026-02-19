import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pago: {
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock eventBus
vi.mock("@/lib/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

import { PaymentService } from "../payment-service";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";

describe("PaymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── validateTransition ──────────────────────────────────────────────────

  describe("validateTransition", () => {
    it("permite PENDIENTE → APROBADO", () => {
      expect(() => PaymentService.validateTransition("PENDIENTE", "APROBADO")).not.toThrow();
    });

    it("permite PENDIENTE → RECHAZADO", () => {
      expect(() => PaymentService.validateTransition("PENDIENTE", "RECHAZADO")).not.toThrow();
    });

    it("permite PENDIENTE → CANCELADO", () => {
      expect(() => PaymentService.validateTransition("PENDIENTE", "CANCELADO")).not.toThrow();
    });

    it("permite RECHAZADO → PENDIENTE (reintento)", () => {
      expect(() => PaymentService.validateTransition("RECHAZADO", "PENDIENTE")).not.toThrow();
    });

    it("permite VENCIDO → APROBADO (pago tardío)", () => {
      expect(() => PaymentService.validateTransition("VENCIDO", "APROBADO")).not.toThrow();
    });

    it("permite APROBADO → REEMBOLSADO", () => {
      expect(() => PaymentService.validateTransition("APROBADO", "REEMBOLSADO")).not.toThrow();
    });

    it("rechaza APROBADO → PENDIENTE (estado terminal)", () => {
      expect(() => PaymentService.validateTransition("APROBADO", "PENDIENTE")).toThrow("Transición de pago inválida");
    });

    it("rechaza APROBADO → RECHAZADO (estado terminal)", () => {
      expect(() => PaymentService.validateTransition("APROBADO", "RECHAZADO")).toThrow("Transición de pago inválida");
    });

    it("rechaza CANCELADO → PENDIENTE (estado terminal)", () => {
      expect(() => PaymentService.validateTransition("CANCELADO", "PENDIENTE")).toThrow("Transición de pago inválida");
    });

    it("rechaza REEMBOLSADO → PENDIENTE (estado terminal)", () => {
      expect(() => PaymentService.validateTransition("REEMBOLSADO", "PENDIENTE")).toThrow("Transición de pago inválida");
    });

    it("rechaza transiciones inventadas", () => {
      expect(() => PaymentService.validateTransition("PENDIENTE", "INVENTADO")).toThrow("Transición de pago inválida");
    });
  });

  // ─── isTerminal ──────────────────────────────────────────────────────────

  describe("isTerminal", () => {
    it("CANCELADO es terminal", () => {
      expect(PaymentService.isTerminal("CANCELADO")).toBe(true);
    });

    it("REEMBOLSADO es terminal", () => {
      expect(PaymentService.isTerminal("REEMBOLSADO")).toBe(true);
    });

    it("PENDIENTE no es terminal", () => {
      expect(PaymentService.isTerminal("PENDIENTE")).toBe(false);
    });

    it("APROBADO no es terminal (puede reembolsarse)", () => {
      expect(PaymentService.isTerminal("APROBADO")).toBe(false);
    });
  });

  // ─── approve ─────────────────────────────────────────────────────────────

  describe("approve", () => {
    it("aprueba un pago PENDIENTE y emite evento", async () => {
      const mockPago = { id: "p1", estado: "PENDIENTE", contratoId: "c1", monto: 5000, mpPaymentId: null, comprobante: null, notas: null };
      (prisma.pago.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(mockPago);
      (prisma.pago.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockPago, estado: "APROBADO" });

      await PaymentService.approve("p1", { metodo: "TRANSFERENCIA", userId: "u1" });

      expect(prisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({ estado: "APROBADO", metodo: "TRANSFERENCIA" }),
        })
      );

      // Evento emitido (fire-and-forget con catch)
      await vi.waitFor(() => {
        expect(eventBus.emit).toHaveBeenCalled();
      });
    });

    it("rechaza aprobar un pago ya APROBADO", async () => {
      const mockPago = { id: "p1", estado: "APROBADO", contratoId: "c1", monto: 5000 };
      (prisma.pago.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(mockPago);

      await expect(
        PaymentService.approve("p1", { metodo: "EFECTIVO", userId: "u1" })
      ).rejects.toThrow("Transición de pago inválida");
    });

    it("rechaza aprobar un pago CANCELADO", async () => {
      const mockPago = { id: "p1", estado: "CANCELADO", contratoId: "c1", monto: 5000 };
      (prisma.pago.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(mockPago);

      await expect(
        PaymentService.approve("p1", { metodo: "EFECTIVO", userId: "u1" })
      ).rejects.toThrow("Transición de pago inválida");
    });
  });

  // ─── reject ──────────────────────────────────────────────────────────────

  describe("reject", () => {
    it("rechaza un pago PENDIENTE", async () => {
      const mockPago = { id: "p1", estado: "PENDIENTE", contratoId: "c1", monto: 5000, notas: null };
      (prisma.pago.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(mockPago);
      (prisma.pago.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...mockPago, estado: "RECHAZADO" });

      await PaymentService.reject("p1", { userId: "u1" });

      expect(prisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: "RECHAZADO" }),
        })
      );
    });

    it("no puede rechazar un pago APROBADO", async () => {
      const mockPago = { id: "p1", estado: "APROBADO", contratoId: "c1", monto: 5000 };
      (prisma.pago.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue(mockPago);

      await expect(PaymentService.reject("p1", { userId: "u1" })).rejects.toThrow("Transición de pago inválida");
    });
  });

  // ─── processWebhook (idempotencia) ──────────────────────────────────────

  describe("processWebhook", () => {
    it("retorna already_processed si ya está en el estado correcto", async () => {
      (prisma.pago.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1", estado: "APROBADO", mpPaymentId: "12345", contratoId: "c1",
      });

      const result = await PaymentService.processWebhook("12345", "approved");
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("already_processed");
    });

    it("retorna pago_not_found si no existe", async () => {
      (prisma.pago.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await PaymentService.processWebhook("99999", "approved");
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("pago_not_found");
    });

    it("retorna unknown_mp_status para status desconocido", async () => {
      (prisma.pago.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1", estado: "PENDIENTE", mpPaymentId: null, contratoId: "c1",
      });

      const result = await PaymentService.processWebhook("12345", "desconocido");
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("unknown_mp_status");
    });

    it("retorna terminal_state para pago CANCELADO", async () => {
      (prisma.pago.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "p1", estado: "CANCELADO", mpPaymentId: null, contratoId: "c1",
      });

      const result = await PaymentService.processWebhook("12345", "approved");
      expect(result.processed).toBe(false);
      expect(result.reason).toBe("terminal_state");
    });
  });

  // ─── mapMPStatus ─────────────────────────────────────────────────────────

  describe("mapMPStatus", () => {
    it("mapea approved → APROBADO", () => {
      expect(PaymentService.mapMPStatus("approved")).toBe("APROBADO");
    });

    it("mapea rejected → RECHAZADO", () => {
      expect(PaymentService.mapMPStatus("rejected")).toBe("RECHAZADO");
    });

    it("mapea in_process → PENDIENTE", () => {
      expect(PaymentService.mapMPStatus("in_process")).toBe("PENDIENTE");
    });

    it("retorna null para status desconocido", () => {
      expect(PaymentService.mapMPStatus("foobar")).toBeNull();
    });
  });
});
