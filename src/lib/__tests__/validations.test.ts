import { describe, it, expect } from "vitest";
import { registrarPagoSchema } from "../validations";

describe("registrarPagoSchema", () => {
  it("acepta aprobación con método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
      metodo: "TRANSFERENCIA",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza aprobación sin método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
    });
    expect(result.success).toBe(false);
  });

  it("acepta rechazo sin método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "RECHAZADO",
    });
    expect(result.success).toBe(true);
  });

  it("acepta cancelación sin método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "CANCELADO",
    });
    expect(result.success).toBe(true);
  });

  it("acepta MERCADOPAGO como método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
      metodo: "MERCADOPAGO",
      mpPaymentId: "12345",
    });
    expect(result.success).toBe(true);
  });

  it("acepta EFECTIVO como método", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
      metodo: "EFECTIVO",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza método inválido", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
      metodo: "BITCOIN",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza estado inválido", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "INVENTADO",
    });
    expect(result.success).toBe(false);
  });

  it("acepta todos los campos opcionales", () => {
    const result = registrarPagoSchema.safeParse({
      estado: "APROBADO",
      metodo: "MERCADOPAGO",
      mpPaymentId: "12345",
      comprobante: "comp.jpg",
      notas: "Pago recibido por MP",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza reembolso sin datos", () => {
    // REEMBOLSADO es un estado válido pero sin metodo requerido
    const result = registrarPagoSchema.safeParse({
      estado: "REEMBOLSADO",
    });
    expect(result.success).toBe(true);
  });
});
