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

// ─── Mantenimientos ──────────────────────────────────────────────────────────

export const tiposMantenimiento = [
  "SERVICE_PREVENTIVO",
  "REPARACION",
  "CAMBIO_ACEITE",
  "CAMBIO_NEUMATICOS",
  "FRENOS",
  "ELECTRICA",
  "CHAPA_PINTURA",
  "OTRO",
] as const;

export const estadosMantenimiento = [
  "PENDIENTE",
  "PROGRAMADO",
  "EN_PROCESO",
  "ESPERANDO_REPUESTO",
  "COMPLETADO",
  "CANCELADO",
] as const;

export const mantenimientoSchema = z.object({
  motoId: z.string().min(1, "Moto es requerida"),
  tipo: z.enum(tiposMantenimiento),
  estado: z.enum(estadosMantenimiento).default("PENDIENTE"),
  descripcion: z.string().min(1, "Descripción es requerida"),
  diagnostico: z.string().optional(),
  solucion: z.string().optional(),
  costoRepuestos: z.coerce.number().min(0).default(0),
  costoManoObra: z.coerce.number().min(0).default(0),
  proveedorId: z.string().optional().nullable(),
  kmAlMomento: z.coerce.number().min(0).optional().nullable(),
  fechaProgramada: z.string().optional().nullable(),
  fechaInicio: z.string().optional().nullable(),
  fechaFin: z.string().optional().nullable(),
  proximoServiceKm: z.coerce.number().min(0).optional().nullable(),
  proximoServiceFecha: z.string().optional().nullable(),
  notas: z.string().max(2000).optional(),
});

export type MantenimientoInput = z.infer<typeof mantenimientoSchema>;

// ─── Proveedores ────────────────────────────────────────────────────────────

export const proveedorSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  rubro: z.string().optional(),
  notas: z.string().max(1000).optional(),
  activo: z.boolean().default(true),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;

// ─── Repuestos ──────────────────────────────────────────────────────────────

export const repuestoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  codigo: z.string().optional(),
  categoria: z.string().optional(),
  precioCompra: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().min(0).default(0),
  stockMinimo: z.coerce.number().min(0).default(2),
  proveedorId: z.string().optional().nullable(),
});

export type RepuestoInput = z.infer<typeof repuestoSchema>;

// ─── Gastos ─────────────────────────────────────────────────────────────────

export const categoriasGasto = [
  "MANTENIMIENTO", "COMBUSTIBLE", "SEGURO", "PATENTE", "REPUESTOS",
  "ALQUILER_LOCAL", "SERVICIOS", "SUELDOS", "MARKETING", "IMPUESTOS",
  "GRUA", "ADMINISTRATIVO", "OTRO",
] as const;

export const categoriaGastoLabels: Record<string, string> = {
  MANTENIMIENTO: "Mantenimiento",
  COMBUSTIBLE: "Combustible",
  SEGURO: "Seguro",
  PATENTE: "Patente",
  REPUESTOS: "Repuestos",
  ALQUILER_LOCAL: "Alquiler Local",
  SERVICIOS: "Servicios",
  SUELDOS: "Sueldos",
  MARKETING: "Marketing",
  IMPUESTOS: "Impuestos",
  GRUA: "Grúa",
  ADMINISTRATIVO: "Administrativo",
  OTRO: "Otro",
};

export const gastoSchema = z.object({
  concepto: z.string().min(1, "Concepto es requerido"),
  descripcion: z.string().optional(),
  monto: z.coerce.number().min(0.01, "Monto debe ser mayor a 0"),
  categoria: z.enum(categoriasGasto),
  subcategoria: z.string().optional(),
  motoId: z.string().optional().nullable(),
  proveedorId: z.string().optional().nullable(),
  mantenimientoId: z.string().optional().nullable(),
  metodoPago: z.string().optional(),
  comprobante: z.string().optional(),
  fecha: z.string().optional(),
  notas: z.string().optional(),
});

export type GastoInput = z.infer<typeof gastoSchema>;

export const presupuestoSchema = z.object({
  mes: z.coerce.number().min(1).max(12),
  anio: z.coerce.number().min(2024).max(2030),
  categoria: z.enum(categoriasGasto),
  montoPresupuestado: z.coerce.number().min(0),
});

export type PresupuestoInput = z.infer<typeof presupuestoSchema>;

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

// ─── Contabilidad ───────────────────────────────────────────────────────────

export const tiposFacturaCompra = ["A", "B", "C", "TICKET", "RECIBO"] as const;
export const estadosFacturaCompra = ["BORRADOR", "PENDIENTE", "PENDIENTE_REVISION", "APROBADA", "RECHAZADA", "PAGADA", "PAGADA_PARCIAL", "VENCIDA", "ANULADA"] as const;

export const facturaCompraSchema = z.object({
  // Proveedor
  proveedorId: z.string().optional().nullable(),
  razonSocial: z.string().min(1, "Razón social es requerida"),
  cuit: z.string()
    .regex(/^\d{2}-\d{8}-\d{1}$/, "CUIT inválido (formato: 20-12345678-9)")
    .optional()
    .or(z.literal("")),

  // Invoice
  tipo: z.enum(tiposFacturaCompra),
  numero: z.string().min(1, "Número es requerido"),
  puntoVenta: z.string().optional(),
  fecha: z.string().min(1, "Fecha es requerida"),
  vencimiento: z.string().optional(),

  // Tax breakdown
  subtotal: z.coerce.number().min(0, "Subtotal no puede ser negativo"),
  iva21: z.coerce.number().min(0).default(0),
  iva105: z.coerce.number().min(0).default(0),
  iva27: z.coerce.number().min(0).default(0),
  percepcionIVA: z.coerce.number().min(0).default(0),
  percepcionIIBB: z.coerce.number().min(0).default(0),
  impInterno: z.coerce.number().min(0).default(0),
  noGravado: z.coerce.number().min(0).default(0),
  exento: z.coerce.number().min(0).default(0),

  // Categorization
  categoria: z.enum(categoriasGasto),
  subcategoria: z.string().optional(),
  centroGasto: z.string().optional(),
  motoId: z.string().optional().nullable(),

  // Estado
  estado: z.enum(estadosFacturaCompra).default("BORRADOR"),
  montoAbonado: z.coerce.number().min(0).default(0),

  // Archivo
  archivoUrl: z.string().optional(),
  archivoNombre: z.string().optional(),

  // CAE (Código Autorización Electrónico)
  cae: z.string().optional(),
  caeVencimiento: z.string().optional(),

  // Notes
  notas: z.string().optional(),
}).refine((data) => {
  // Calculate total and validate
  const calculatedTotal =
    data.subtotal +
    data.iva21 +
    data.iva105 +
    data.iva27 +
    data.percepcionIVA +
    data.percepcionIIBB +
    data.impInterno +
    data.noGravado +
    data.exento;
  return calculatedTotal > 0;
}, {
  message: "El total debe ser mayor a 0",
  path: ["subtotal"],
});

export type FacturaCompraInput = z.infer<typeof facturaCompraSchema>;

// ─── Chart of Accounts ──────────────────────────────────────────────────────

export const tiposCuenta = ["ACTIVO", "PASIVO", "PATRIMONIO", "INGRESO", "EGRESO"] as const;

export const cuentaContableSchema = z.object({
  codigo: z.string()
    .min(1, "Código es requerido")
    .regex(/^\d+(\.\d+)*$/, "Formato inválido (ej: 1.1.01.001)"),
  nombre: z.string().min(1, "Nombre es requerido"),
  tipo: z.enum(tiposCuenta),
  padre: z.string().optional().nullable(),
  nivel: z.coerce.number().min(1).max(5).default(1),
  imputable: z.boolean().default(true),
  activa: z.boolean().default(true),
  descripcion: z.string().optional(),
});

export type CuentaContableInput = z.infer<typeof cuentaContableSchema>;

// ─── Journal Entries ────────────────────────────────────────────────────────

export const tiposAsiento = ["APERTURA", "COMPRA", "VENTA", "PAGO", "COBRO", "AJUSTE", "CIERRE"] as const;

export const lineaAsientoSchema = z.object({
  cuentaId: z.string().min(1, "Cuenta es requerida"),
  debe: z.coerce.number().min(0).default(0),
  haber: z.coerce.number().min(0).default(0),
  descripcion: z.string().optional(),
}).refine((data) => {
  // Either debe or haber, not both
  return (data.debe > 0 && data.haber === 0) || (data.haber > 0 && data.debe === 0);
}, {
  message: "Una línea debe tener debe O haber, no ambos",
  path: ["debe"],
});

export const asientoContableSchema = z.object({
  fecha: z.string().min(1, "Fecha es requerida"),
  tipo: z.enum(tiposAsiento),
  descripcion: z.string().min(1, "Descripción es requerida"),
  notas: z.string().optional(),
  lineas: z.array(lineaAsientoSchema).min(2, "Mínimo 2 líneas requeridas"),
}).refine((data) => {
  // Double-entry validation: total debe = total haber
  const totalDebe = data.lineas.reduce((sum, l) => sum + (l.debe || 0), 0);
  const totalHaber = data.lineas.reduce((sum, l) => sum + (l.haber || 0), 0);
  return Math.abs(totalDebe - totalHaber) < 0.01; // Float precision
}, {
  message: "El total del Debe debe ser igual al total del Haber",
  path: ["lineas"],
});

export type AsientoContableInput = z.infer<typeof asientoContableSchema>;
export type LineaAsientoInput = z.infer<typeof lineaAsientoSchema>;

// ─── RRHH ────────────────────────────────────────────────────────────────────

export const estadosEmpleado = ["ACTIVO", "LICENCIA", "SUSPENDIDO", "BAJA"] as const;
export const tiposContrato = ["TIEMPO_INDETERMINADO", "PLAZO_FIJO", "EVENTUAL", "TEMPORADA", "PASANTIA"] as const;
export const tiposRecibo = ["MENSUAL", "SAC_1", "SAC_2", "FINAL", "VACACIONES"] as const;
export const estadosRecibo = ["BORRADOR", "CONFIRMADO", "PAGADO", "ANULADO"] as const;
export const tiposAusencia = ["VACACIONES", "ENFERMEDAD", "ACCIDENTE_LABORAL", "LICENCIA_MATERNIDAD", "LICENCIA_PATERNIDAD", "ESTUDIO", "MATRIMONIO", "FALLECIMIENTO_FAMILIAR", "MUDANZA", "DONACION_SANGRE", "INJUSTIFICADA", "OTRO"] as const;
export const estadosCiviles = ["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"] as const;
export const departamentos = ["OPERACIONES", "ADMINISTRACION", "COMERCIAL", "TALLER"] as const;
export const jornadasLaborales = ["COMPLETA", "PARCIAL"] as const;

export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  apellido: z.string().min(1, "Apellido es requerido"),
  dni: z.string().min(7, "DNI inválido"),
  cuil: z.string().optional().or(z.literal("")),
  fechaNacimiento: z.string().optional(),
  sexo: z.string().optional(),
  estadoCivil: z.string().optional(),
  nacionalidad: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  codigoPostal: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  contactoEmergencia: z.string().optional(),
  telefonoEmergencia: z.string().optional(),
  fechaIngreso: z.string().min(1, "Fecha de ingreso es requerida"),
  fechaEgreso: z.string().optional(),
  estado: z.enum(estadosEmpleado).default("ACTIVO"),
  cargo: z.string().min(1, "Cargo es requerido"),
  departamento: z.string().optional(),
  tipoContrato: z.enum(tiposContrato).default("TIEMPO_INDETERMINADO"),
  jornadaLaboral: z.string().optional(),
  horasSemanales: z.coerce.number().optional(),
  salarioBasico: z.coerce.number().min(0, "Salario no puede ser negativo"),
  categoriaCCT: z.string().optional(),
  obraSocial: z.string().optional(),
  sindicato: z.string().optional(),
  nroAfiliado: z.string().optional(),
  cbu: z.string().optional(),
  banco: z.string().optional(),
  altaAFIP: z.boolean().optional(),
  fechaAltaAFIP: z.string().optional(),
  artContratada: z.string().optional(),
  nroART: z.string().optional(),
  imagen: z.string().optional(),
  notas: z.string().optional(),
});

export const reciboSueldoSchema = z.object({
  empleadoId: z.string().min(1, "Empleado es requerido"),
  mes: z.coerce.number().min(1).max(12),
  anio: z.coerce.number().min(2020).max(2050),
  tipo: z.enum(tiposRecibo).default("MENSUAL"),
  salarioBasico: z.coerce.number().min(0),
  presentismo: z.coerce.number().min(0).default(0),
  antiguedad: z.coerce.number().min(0).default(0),
  horasExtra50: z.coerce.number().min(0).default(0),
  horasExtra100: z.coerce.number().min(0).default(0),
  adicionales: z.coerce.number().min(0).default(0),
  jubilacion: z.coerce.number().min(0).default(0),
  obraSocial: z.coerce.number().min(0).default(0),
  sindicato: z.coerce.number().min(0).default(0),
  ley19032: z.coerce.number().min(0).default(0),
  impuestoGanancias: z.coerce.number().min(0).default(0),
  otrasDeduccciones: z.coerce.number().min(0).default(0),
  aporteJubilacion: z.coerce.number().min(0).default(0),
  aporteObraSocial: z.coerce.number().min(0).default(0),
  aportePAMI: z.coerce.number().min(0).default(0),
  aporteART: z.coerce.number().min(0).default(0),
  seguroVida: z.coerce.number().min(0).default(0),
  estado: z.enum(estadosRecibo).default("BORRADOR"),
  fechaPago: z.string().optional(),
  notas: z.string().optional(),
});

export const ausenciaSchema = z.object({
  empleadoId: z.string().min(1, "Empleado es requerido"),
  tipo: z.enum(tiposAusencia),
  fechaInicio: z.string().min(1, "Fecha inicio es requerida"),
  fechaFin: z.string().min(1, "Fecha fin es requerida"),
  dias: z.coerce.number().min(1),
  justificada: z.boolean().default(false),
  certificado: z.string().optional(),
  notas: z.string().optional(),
  estado: z.string().default("PENDIENTE"),
});

export type EmpleadoInput = z.infer<typeof empleadoSchema>;
export type ReciboSueldoInput = z.infer<typeof reciboSueldoSchema>;
export type AusenciaInput = z.infer<typeof ausenciaSchema>;

// ─── Notas de Crédito ───────────────────────────────────────────────────────

export const tiposNotaCredito = ["DEVOLUCION_TOTAL", "DEVOLUCION_PARCIAL", "DESCUENTO", "AJUSTE_PRECIO"] as const;
export const estadosNotaCredito = ["EMITIDA", "APLICADA", "REEMBOLSADA", "ANULADA"] as const;

export const notaCreditoSchema = z.object({
  tipo: z.enum(tiposNotaCredito),
  facturaOriginalId: z.string().optional(),
  clienteId: z.string().min(1, "Cliente es requerido"),
  monto: z.coerce.number().min(0.01, "Monto debe ser mayor a 0"),
  montoNeto: z.coerce.number().min(0).optional(),
  montoIva: z.coerce.number().min(0).optional(),
  motivo: z.string().min(1, "Motivo es requerido"),
  estado: z.enum(estadosNotaCredito).default("EMITIDA"),
  aplicadaAId: z.string().optional(),
  fechaAplicacion: z.string().optional(),
});

export type NotaCreditoInput = z.infer<typeof notaCreditoSchema>;

// ─── Baja Motos ──────────────────────────────────────────────────────────────

export const tiposBaja = ["ROBO", "SINIESTRO", "VENTA"] as const;
export const formasPagoBaja = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE"] as const;

export const bajaMotoSchema = z.object({
  motoId: z.string().min(1, "Moto es requerida"),
  tipoBaja: z.enum(tiposBaja),
  fechaBaja: z.string().min(1, "Fecha de baja es requerida"),
  motivo: z.string().optional(),

  // ROBO
  numeroDenuncia: z.string().optional(),
  comisaria: z.string().optional(),
  fechaDenuncia: z.string().optional(),

  // SINIESTRO
  numeroSiniestro: z.string().optional(),
  aseguradora: z.string().optional(),
  montoIndemnizacion: z.coerce.number().min(0).optional(),
  fechaSiniestro: z.string().optional(),

  // VENTA
  compradorNombre: z.string().optional(),
  compradorDNI: z.string().optional(),
  compradorTelefono: z.string().optional(),
  precioVenta: z.coerce.number().min(0).optional(),
  formaPago: z.enum(formasPagoBaja).optional(),

  // General
  archivoUrl: z.string().optional(),
  notas: z.string().max(1000).optional(),
});

export type BajaMotoInput = z.infer<typeof bajaMotoSchema>;
