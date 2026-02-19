import { describe, it, expect } from "vitest";
import { ContractStateMachine } from "../contract-state-machine";

describe("ContractStateMachine", () => {

  // ─── validateTransition ──────────────────────────────────────────────────

  describe("validateTransition", () => {
    it("permite PENDIENTE → ACTIVO", () => {
      expect(() => ContractStateMachine.validateTransition("PENDIENTE", "ACTIVO")).not.toThrow();
    });

    it("permite PENDIENTE → CANCELADO", () => {
      expect(() => ContractStateMachine.validateTransition("PENDIENTE", "CANCELADO")).not.toThrow();
    });

    it("permite ACTIVO → FINALIZADO", () => {
      expect(() => ContractStateMachine.validateTransition("ACTIVO", "FINALIZADO")).not.toThrow();
    });

    it("permite ACTIVO → CANCELADO", () => {
      expect(() => ContractStateMachine.validateTransition("ACTIVO", "CANCELADO")).not.toThrow();
    });

    it("permite ACTIVO → FINALIZADO_COMPRA", () => {
      expect(() => ContractStateMachine.validateTransition("ACTIVO", "FINALIZADO_COMPRA")).not.toThrow();
    });

    it("rechaza FINALIZADO → ACTIVO (terminal)", () => {
      expect(() => ContractStateMachine.validateTransition("FINALIZADO", "ACTIVO")).toThrow("Transición de contrato inválida");
    });

    it("rechaza FINALIZADO → PENDIENTE (terminal)", () => {
      expect(() => ContractStateMachine.validateTransition("FINALIZADO", "PENDIENTE")).toThrow("Transición de contrato inválida");
    });

    it("rechaza CANCELADO → ACTIVO (terminal)", () => {
      expect(() => ContractStateMachine.validateTransition("CANCELADO", "ACTIVO")).toThrow("Transición de contrato inválida");
    });

    it("rechaza FINALIZADO_COMPRA → cualquier cosa (terminal)", () => {
      expect(() => ContractStateMachine.validateTransition("FINALIZADO_COMPRA", "ACTIVO")).toThrow("Transición de contrato inválida");
    });

    it("rechaza PENDIENTE → FINALIZADO (skip ACTIVO)", () => {
      expect(() => ContractStateMachine.validateTransition("PENDIENTE", "FINALIZADO")).toThrow("Transición de contrato inválida");
    });

    it("rechaza ACTIVO → PENDIENTE (retroceso)", () => {
      expect(() => ContractStateMachine.validateTransition("ACTIVO", "PENDIENTE")).toThrow("Transición de contrato inválida");
    });

    it("rechaza transición inventada", () => {
      expect(() => ContractStateMachine.validateTransition("PENDIENTE", "INVENTADO")).toThrow("Transición de contrato inválida");
    });
  });

  // ─── isTerminal ──────────────────────────────────────────────────────────

  describe("isTerminal", () => {
    it("FINALIZADO es terminal", () => {
      expect(ContractStateMachine.isTerminal("FINALIZADO")).toBe(true);
    });

    it("CANCELADO es terminal", () => {
      expect(ContractStateMachine.isTerminal("CANCELADO")).toBe(true);
    });

    it("FINALIZADO_COMPRA es terminal", () => {
      expect(ContractStateMachine.isTerminal("FINALIZADO_COMPRA")).toBe(true);
    });

    it("PENDIENTE no es terminal", () => {
      expect(ContractStateMachine.isTerminal("PENDIENTE")).toBe(false);
    });

    it("ACTIVO no es terminal", () => {
      expect(ContractStateMachine.isTerminal("ACTIVO")).toBe(false);
    });
  });

  // ─── getAllowedTransitions ───────────────────────────────────────────────

  describe("getAllowedTransitions", () => {
    it("PENDIENTE puede ir a ACTIVO o CANCELADO", () => {
      expect(ContractStateMachine.getAllowedTransitions("PENDIENTE")).toEqual(["ACTIVO", "CANCELADO"]);
    });

    it("ACTIVO puede ir a FINALIZADO, CANCELADO, o FINALIZADO_COMPRA", () => {
      expect(ContractStateMachine.getAllowedTransitions("ACTIVO")).toEqual(["FINALIZADO", "CANCELADO", "FINALIZADO_COMPRA"]);
    });

    it("FINALIZADO retorna vacío (terminal)", () => {
      expect(ContractStateMachine.getAllowedTransitions("FINALIZADO")).toEqual([]);
    });

    it("estado desconocido retorna vacío", () => {
      expect(ContractStateMachine.getAllowedTransitions("INVENTADO")).toEqual([]);
    });
  });
});
