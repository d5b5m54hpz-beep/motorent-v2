import { z } from "zod";

// ─── Motos ───────────────────────────────────────────────────────────────────

export const motoSchema = z.object({
  marca: z.string().min(1, "Marca es requerida"),
  modelo: z.string().min(1, "Modelo es requerido"),
  patente: z.string().min(1, "Patente es requerida"),
  anio: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  estado: z.enum(["disponible", "alquilada", "mantenimiento"]).default("disponible"),
});

export type MotoInput = z.infer<typeof motoSchema>;

// ─── Contratos ───────────────────────────────────────────────────────────────

export const contratoSchema = z.object({
  clienteId: z.string().min(1, "Cliente es requerido"),
  motoId: z.string().min(1, "Moto es requerida"),
  fechaInicio: z.string().min(1, "Fecha inicio es requerida"),
  fechaFin: z.string().min(1, "Fecha fin es requerida"),
  precioSemana: z.coerce.number().positive("Precio debe ser positivo"),
  estado: z.enum(["pendiente", "activo", "vencido", "finalizado"]).default("pendiente"),
  duracionMeses: z.coerce.number().optional(),
  tipoPago: z.enum(["mensual", "semanal"]).optional(),
  precioMensual: z.coerce.number().optional(),
  precioSemanal: z.coerce.number().optional(),
  descuentoDuracion: z.coerce.number().optional(),
  descuentoSemanal: z.coerce.number().optional(),
});

export type ContratoInput = z.infer<typeof contratoSchema>;

// ─── Pagos ───────────────────────────────────────────────────────────────────

export const pagoSchema = z.object({
  contratoId: z.string().min(1, "Contrato es requerido"),
  monto: z.coerce.number().positive("Monto debe ser positivo"),
  metodo: z.enum(["transferencia", "tarjeta", "mercadopago", "efectivo"]),
  referencia: z.string().optional(),
});

export type PagoInput = z.infer<typeof pagoSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Pricing ─────────────────────────────────────────────────────────────────

export const pricingSchema = z.object({
  precioBaseMensual: z.coerce.number().positive(),
  descuentoSemanal: z.coerce.number().min(0).max(100),
  duraciones: z.object({
    meses3: z.coerce.number().min(0).max(100),
    meses6: z.coerce.number().min(0).max(100),
    meses9: z.coerce.number().min(0).max(100),
    meses12: z.coerce.number().min(0).max(100),
  }),
});

export type PricingInput = z.infer<typeof pricingSchema>;

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const createUsuarioSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "Nombre es requerido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "OPERADOR", "CLIENTE"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual es requerida"),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres"),
});
