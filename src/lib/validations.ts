import { z } from "zod";

// ─── Motos ───────────────────────────────────────────────────────────────────

export const motoEstados = ["disponible", "alquilada", "mantenimiento", "baja"] as const;
export const motoTipos = ["naked", "touring", "sport", "scooter", "custom"] as const;

export const motoSchema = z.object({
  marca: z.string().min(1, "Marca es requerida"),
  modelo: z.string().min(1, "Modelo es requerido"),
  patente: z
    .string()
    .min(1, "Patente es requerida")
    .regex(/^[A-Z]{2}\d{3}[A-Z]{2}$|^[A-Z]{3}\d{3}$/, "Formato de patente invalido (ej: AA123BB o ABC123)"),
  anio: z.coerce.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  kilometraje: z.coerce.number().min(0, "Kilometraje no puede ser negativo").default(0),
  precioMensual: z.coerce.number().min(0, "Precio no puede ser negativo").default(0),
  cilindrada: z.coerce.number().min(0).optional(),
  tipo: z.enum(motoTipos).optional(),
  descripcion: z.string().max(500, "Descripcion muy larga").optional(),
  imagen: z.string().url("URL de imagen invalida").optional().or(z.literal("")),
  estado: z.enum(motoEstados).default("disponible"),
});

export type MotoInput = z.infer<typeof motoSchema>;

// ─── Clientes ───────────────────────────────────────────────────────────────

export const clienteEstados = ["pendiente", "aprobado", "rechazado"] as const;

export const clienteSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Email invalido"),
  telefono: z.string().optional(),
  dni: z.string().optional(),
  dniVerificado: z.boolean().default(false),
  licencia: z.string().optional(),
  licenciaVencimiento: z.string().optional(),
  licenciaVerificada: z.boolean().default(false),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  notas: z.string().max(1000, "Notas muy largas").optional(),
  estado: z.enum(clienteEstados).default("pendiente"),
});

export type ClienteInput = z.infer<typeof clienteSchema>;

// ─── Contratos ───────────────────────────────────────────────────────────────

export const contratoEstados = ["pendiente", "activo", "finalizado", "cancelado"] as const;
export const frecuenciasPago = ["semanal", "quincenal", "mensual"] as const;

export const contratoSchema = z.object({
  clienteId: z.string().min(1, "Cliente es requerido"),
  motoId: z.string().min(1, "Moto es requerida"),
  fechaInicio: z.string().min(1, "Fecha inicio es requerida"),
  fechaFin: z.string().min(1, "Fecha fin es requerida"),
  frecuenciaPago: z.enum(frecuenciasPago).default("mensual"),
  deposito: z.coerce.number().min(0, "Deposito no puede ser negativo").default(0),
  notas: z.string().max(1000, "Notas muy largas").optional(),
  renovacionAuto: z.boolean().default(false),
}).refine((data) => {
  const inicio = new Date(data.fechaInicio);
  const fin = new Date(data.fechaFin);
  return fin > inicio;
}, {
  message: "Fecha fin debe ser posterior a fecha inicio",
  path: ["fechaFin"],
});

export type ContratoInput = z.infer<typeof contratoSchema>;

// ─── Pagos ───────────────────────────────────────────────────────────────────

export const pagoEstados = [
  "pendiente",
  "aprobado",
  "rechazado",
  "reembolsado",
  "cancelado",
] as const;

export const pagoMetodos = [
  "efectivo",
  "transferencia",
  "mercadopago",
  "pendiente",
] as const;

export const pagoSchema = z.object({
  contratoId: z.string().min(1, "Contrato es requerido"),
  monto: z.coerce.number().positive("Monto debe ser positivo"),
  metodo: z.enum(["transferencia", "tarjeta", "mercadopago", "efectivo"]),
  referencia: z.string().optional(),
});

export type PagoInput = z.infer<typeof pagoSchema>;

export const registrarPagoSchema = z.object({
  estado: z.enum(["pendiente", "aprobado", "rechazado", "reembolsado", "cancelado"]),
  metodo: z.enum(["efectivo", "transferencia", "mercadopago"]).optional(),
  mpPaymentId: z.string().optional(),
  comprobante: z.string().optional(),
  notas: z.string().optional(),
}).refine(
  (data) => {
    // Si se aprueba, metodo es requerido
    if (data.estado === "aprobado" && !data.metodo) {
      return false;
    }
    return true;
  },
  {
    message: "Método de pago es requerido al aprobar",
    path: ["metodo"],
  }
);

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

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
  descuentoMeses3: z.coerce.number().min(0).max(100),
  descuentoMeses6: z.coerce.number().min(0).max(100),
  descuentoMeses9: z.coerce.number().min(0).max(100),
  descuentoMeses12: z.coerce.number().min(0).max(100),
});

export type PricingInput = z.infer<typeof pricingSchema>;

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const createUsuarioSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "Nombre es requerido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "OPERADOR", "CLIENTE"]),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").optional(),
  role: z.enum(["ADMIN", "OPERADOR", "CLIENTE"]).optional(),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres").optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Al menos un campo debe ser actualizado",
});

export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual es requerida"),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Facturas ────────────────────────────────────────────────────────────────

export const facturaTipos = ["A", "B", "C"] as const;

export const facturaSchema = z.object({
  tipo: z.enum(facturaTipos),
  puntoVenta: z.coerce.number().min(1).max(9999).default(1),
  cae: z.string().optional(),
  caeVencimiento: z.string().optional(),
  razonSocial: z.string().optional(),
  cuit: z.string().optional(),
});

export type FacturaInput = z.infer<typeof facturaSchema>;

// ─── Client Portal ───────────────────────────────────────────────────────────

// Rental flow schema
export const rentalFlowSchema = z.object({
  motoId: z.string().min(1, "Moto es requerida"),
  fechaInicio: z.string().min(1, "Fecha de inicio es requerida"),
  duracion: z.coerce.number().min(1, "Duración mínima es 1 mes").max(24, "Duración máxima es 24 meses"),
  frecuencia: z.enum(frecuenciasPago),
}).refine((data) => {
  const inicio = new Date(data.fechaInicio);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return inicio >= hoy;
}, {
  message: "La fecha de inicio debe ser hoy o en el futuro",
  path: ["fechaInicio"],
});

export type RentalFlowInput = z.infer<typeof rentalFlowSchema>;

// Profile update schema - clients can't change estado or email
export const updateProfileSchema = clienteSchema
  .omit({ estado: true, email: true })
  .partial();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
