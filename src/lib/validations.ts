import { z } from "zod";

// ─── Shared Constants ────────────────────────────────────────────────────────

export const CUIT_REGEX = /^\d{2}-\d{8}-\d$/;

// ─── Motos ───────────────────────────────────────────────────────────────────

export const motoEstados = ["disponible", "alquilada", "mantenimiento", "baja"] as const;
export const estadosPatentamiento = ["SIN_PATENTAR", "EN_TRAMITE", "PATENTADA"] as const;
export const estadosSeguro = ["SIN_SEGURO", "EN_TRAMITE", "ASEGURADA"] as const;

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
  precioMensual: z.coerce.number().min(0, "Precio no puede ser negativo").optional().default(0),
  cilindrada: z.coerce.number().min(0).optional(),
  tipo: z.string().optional(), // Dinámico - acepta cualquier valor
  descripcion: z.string().max(500, "Descripcion muy larga").optional(),
  numeroMotor: z.string().max(50).optional(),
  numeroCuadro: z.string().max(50).optional(),
  imagen: z.string().url("URL de imagen invalida").optional().or(z.literal("")),
  estado: z.enum(motoEstados).default("disponible"),

  // Patentamiento
  estadoPatentamiento: z.enum(estadosPatentamiento).optional(),
  fechaInicioTramitePatente: z.string().optional(),
  fechaPatentamiento: z.string().optional(),
  notasPatentamiento: z.string().max(500).optional(),

  // Seguro
  estadoSeguro: z.enum(estadosSeguro).optional(),
  aseguradora: z.string().max(100).optional(),
  numeroPoliza: z.string().max(100).optional(),
  fechaInicioSeguro: z.string().optional(),
  fechaVencimientoSeguro: z.string().optional(),
  notasSeguro: z.string().max(500).optional(),
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
  esOpcionCompra: z.boolean().default(false),
  mesesParaCompra: z.coerce.number().int().min(1).optional(),
  valorCompraFinal: z.coerce.number().min(0).optional(),
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

const allRoles = ["ADMIN", "OPERADOR", "CLIENTE", "CONTADOR", "RRHH_MANAGER", "COMERCIAL", "VIEWER"] as const;

export const createUsuarioSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(1, "Nombre es requerido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(allRoles),
  profileIds: z.array(z.string()).optional(),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").optional(),
  role: z.enum(allRoles).optional(),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres").optional(),
  profileIds: z.array(z.string()).optional(),
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

// ─── Gastos ──────────────────────────────────────────────────────────────────

export const categoriasGasto = [
  "MANTENIMIENTO",
  "COMBUSTIBLE",
  "SEGURO",
  "PATENTE",
  "REPUESTOS",
  "ALQUILER_LOCAL",
  "SERVICIOS",
  "SUELDOS",
  "MARKETING",
  "IMPUESTOS",
  "GRUA",
  "ADMINISTRATIVO",
  "OTRO",
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
  monto: z.coerce.number().positive("Monto debe ser positivo"),
  categoria: z.enum(categoriasGasto),
  subcategoria: z.string().optional(),
  motoId: z.string().optional(),
  proveedorId: z.string().optional(),
  mantenimientoId: z.string().optional(),
  metodoPago: z.string().optional(),
  comprobante: z.string().optional(),
  fecha: z.string().optional(),
  notas: z.string().max(1000, "Notas muy largas").optional(),
});

export type GastoInput = z.infer<typeof gastoSchema>;

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
  costoTotal: z.coerce.number().min(0).default(0),
  proveedorId: z.string().optional(),
  kmAlMomento: z.coerce.number().int().min(0).optional(),
  fechaProgramada: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  proximoServiceKm: z.coerce.number().int().min(0).optional(),
  proximoServiceFecha: z.string().optional(),
  notas: z.string().max(1000, "Notas muy largas").optional(),
});

export type MantenimientoInput = z.infer<typeof mantenimientoSchema>;

// ─── Proveedores ─────────────────────────────────────────────────────────────

export const proveedorSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  cuit: z.string().optional(),
  condicionIva: z.enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "NO_RESPONSABLE", "CONSUMIDOR_FINAL"]).optional(),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  direccion: z.string().optional(),
  rubro: z.string().optional(),
  notas: z.string().max(1000, "Notas muy largas").optional(),
  activo: z.boolean().default(true),
});

export type ProveedorInput = z.infer<typeof proveedorSchema>;

// ─── Repuestos ───────────────────────────────────────────────────────────────

// ─── REPUESTO (V2 ampliado) ─────────────────────────────────────
export const repuestoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  codigo: z.string().optional(),
  codigoFabricante: z.string().optional(),
  categoria: z.string().optional(),
  descripcion: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  precioCompra: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  stockMinimo: z.coerce.number().int().min(0).default(2),
  proveedorId: z.string().optional(),
  unidad: z.string().optional(),
  unidadCompra: z.string().optional(),
  factorConversion: z.coerce.number().min(1).default(1).optional(),
  vidaUtilKm: z.coerce.number().int().min(0).optional(),
  ubicacion: z.string().optional(),
  codigoBarras: z.string().optional(),
  pesoUnitarioKg: z.coerce.number().min(0).optional(),
  volumenUnitarioCbm: z.coerce.number().min(0).optional(),
  activo: z.boolean().default(true).optional(),
});

export type RepuestoInput = z.infer<typeof repuestoSchema>;

// ─── UBICACIÓN DEPÓSITO ─────────────────────────────────────────
export const ubicacionDepositoSchema = z.object({
  estante: z.string().min(1, "Estante es requerido"),
  fila: z.string().min(1, "Fila es requerida"),
  posicion: z.string().min(1, "Posición es requerida"),
  nombre: z.string().optional(),
  notas: z.string().optional(),
});

// ─── ORDEN DE COMPRA ────────────────────────────────────────────
export const ordenCompraSchema = z.object({
  proveedorId: z.string().min(1, "Proveedor es requerido"),
  fechaEntregaEstimada: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(z.object({
    repuestoId: z.string().min(1),
    cantidad: z.coerce.number().int().min(1, "Mínimo 1"),
    precioUnitario: z.coerce.number().min(0).default(0),
  })).min(1, "Debe tener al menos 1 item"),
});

// ─── RECEPCIÓN DE MERCADERÍA ────────────────────────────────────
export const recepcionSchema = z.object({
  ordenCompraId: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(z.object({
    repuestoId: z.string().min(1),
    cantidadRecibida: z.coerce.number().int().min(0),
    cantidadRechazada: z.coerce.number().int().min(0).default(0),
    ubicacionAsignada: z.string().optional(),
    observaciones: z.string().optional(),
  })).min(1, "Debe tener al menos 1 item"),
});

// ─── AJUSTE DE STOCK ────────────────────────────────────────────
export const ajusteStockSchema = z.object({
  repuestoId: z.string().min(1),
  tipo: z.enum(["ENTRADA_AJUSTE", "SALIDA_AJUSTE", "SALIDA_ROTURA"]),
  cantidad: z.coerce.number().int().min(1, "Mínimo 1"),
  motivo: z.string().min(1, "Motivo es requerido"),
});

// ─── IMPORTACIÓN MASIVA ─────────────────────────────────────────
export const importRepuestoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  codigo: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  precioCompra: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  stockMinimo: z.coerce.number().int().min(0).default(2),
  unidad: z.string().optional(),
  ubicacion: z.string().optional(),
});

// ─── Contabilidad ────────────────────────────────────────────────────────────

export const tiposCuenta = ["ACTIVO", "PASIVO", "PATRIMONIO", "INGRESO", "EGRESO"] as const;

export const cuentaContableSchema = z.object({
  codigo: z.string().min(1, "Código es requerido"),
  nombre: z.string().min(1, "Nombre es requerido"),
  tipo: z.enum(tiposCuenta),
  padre: z.string().optional(),
  nivel: z.coerce.number().int().min(1).default(1),
  imputable: z.boolean().default(true),
  activa: z.boolean().default(true),
  descripcion: z.string().optional(),
});

export type CuentaContableInput = z.infer<typeof cuentaContableSchema>;

export const tiposFacturaCompra = ["A", "B", "C", "TICKET", "RECIBO"] as const;
export const estadosFacturaCompra = [
  "BORRADOR",
  "PENDIENTE",
  "PENDIENTE_REVISION",
  "APROBADA",
  "RECHAZADA",
  "PAGADA",
  "PAGADA_PARCIAL",
  "VENCIDA",
  "ANULADA",
] as const;

export const facturaCompraSchema = z.object({
  proveedorId: z.string().optional(),
  razonSocial: z.string().min(1, "Razón social es requerida"),
  cuit: z.string().optional(),
  tipo: z.enum(tiposFacturaCompra),
  numero: z.string().min(1, "Número es requerido"),
  puntoVenta: z.string().optional(),
  fecha: z.string().min(1, "Fecha es requerida"),
  vencimiento: z.string().optional(),
  subtotal: z.coerce.number().min(0),
  iva21: z.coerce.number().min(0).default(0),
  iva105: z.coerce.number().min(0).default(0),
  iva27: z.coerce.number().min(0).default(0),
  percepcionIVA: z.coerce.number().min(0).default(0),
  percepcionIIBB: z.coerce.number().min(0).default(0),
  impInterno: z.coerce.number().min(0).default(0),
  noGravado: z.coerce.number().min(0).default(0),
  exento: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  categoria: z.enum(categoriasGasto),
  subcategoria: z.string().optional(),
  centroGasto: z.string().optional(),
  motoId: z.string().optional(),
  estado: z.enum(estadosFacturaCompra).default("BORRADOR"),
  montoAbonado: z.coerce.number().min(0).default(0),
  archivoUrl: z.string().optional(),
  archivoNombre: z.string().optional(),
  cae: z.string().optional(),
  caeVencimiento: z.string().optional(),
  notas: z.string().max(2000, "Notas muy largas").optional(),
});

export type FacturaCompraInput = z.infer<typeof facturaCompraSchema>;

// ─── RRHH ────────────────────────────────────────────────────────────────────

export const estadosEmpleado = ["ACTIVO", "LICENCIA", "SUSPENDIDO", "BAJA"] as const;
export const tiposContrato = ["TIEMPO_INDETERMINADO", "PLAZO_FIJO", "EVENTUAL", "TEMPORADA", "PASANTIA"] as const;
export const estadosCiviles = ["SOLTERO", "CASADO", "DIVORCIADO", "VIUDO", "UNION_CONVIVENCIAL"] as const;
export const departamentos = ["OPERACIONES", "ADMINISTRACION", "COMERCIAL", "TALLER", "GERENCIA"] as const;
export const jornadasLaborales = ["COMPLETA", "PARCIAL", "ROTATIVA", "NOCTURNA"] as const;

export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  apellido: z.string().min(1, "Apellido es requerido"),
  dni: z.string().min(1, "DNI es requerido"),
  cuil: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  sexo: z.string().optional(),
  estadoCivil: z.string().optional(), // Accept any string for flexibility
  nacionalidad: z.string().default("Argentina"),
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
  departamento: z.string().optional(), // Accept any string for flexibility
  tipoContrato: z.enum(tiposContrato).default("TIEMPO_INDETERMINADO"),
  jornadaLaboral: z.string().optional(), // Accept any string for flexibility
  horasSemanales: z.coerce.number().int().min(0).default(48),
  salarioBasico: z.coerce.number().min(0),
  categoriaCCT: z.string().optional(),
  obraSocial: z.string().optional(),
  sindicato: z.string().optional(),
  nroAfiliado: z.string().optional(),
  cbu: z.string().optional(),
  banco: z.string().optional(),
  altaAFIP: z.boolean().default(false),
  fechaAltaAFIP: z.string().optional(),
  artContratada: z.string().optional(),
  nroART: z.string().optional(),
  imagen: z.string().optional(),
  notas: z.string().max(2000, "Notas muy largas").optional(),
});

export type EmpleadoInput = z.infer<typeof empleadoSchema>;

export const tiposAusencia = [
  "VACACIONES",
  "ENFERMEDAD",
  "ACCIDENTE_LABORAL",
  "LICENCIA_MATERNIDAD",
  "LICENCIA_PATERNIDAD",
  "ESTUDIO",
  "MATRIMONIO",
  "FALLECIMIENTO_FAMILIAR",
  "MUDANZA",
  "DONACION_SANGRE",
  "INJUSTIFICADA",
  "OTRO",
] as const;

export const ausenciaSchema = z.object({
  empleadoId: z.string().min(1, "Empleado es requerido"),
  tipo: z.enum(tiposAusencia),
  fechaInicio: z.string().min(1, "Fecha inicio es requerida"),
  fechaFin: z.string().min(1, "Fecha fin es requerida"),
  dias: z.coerce.number().int().min(1),
  justificada: z.boolean().default(false),
  certificado: z.string().optional(),
  notas: z.string().max(1000, "Notas muy largas").optional(),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).default("PENDIENTE"),
});

export type AusenciaInput = z.infer<typeof ausenciaSchema>;

// ─── Flota ───────────────────────────────────────────────────────────────────

export const tiposBaja = ["ROBO", "SINIESTRO", "VENTA"] as const;

export const bajaMotoSchema = z.object({
  motoId: z.string().optional(), // Usado en defaultValues del form
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
  formaPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "CHEQUE"]).optional(),
  // Documentación
  archivoUrl: z.string().optional(),
  notas: z.string().max(2000, "Notas muy largas").optional(),
});

export type BajaMotoInput = z.infer<typeof bajaMotoSchema>;

// ─── Notas de Crédito ────────────────────────────────────────────────────────

export const tiposNotaCredito = ["DEVOLUCION_TOTAL", "DEVOLUCION_PARCIAL", "DESCUENTO", "AJUSTE_PRECIO"] as const;

export const notaCreditoSchema = z.object({
  tipo: z.enum(tiposNotaCredito),
  facturaOriginalId: z.string().optional(),
  clienteId: z.string().min(1, "Cliente es requerido"),
  monto: z.coerce.number().positive("Monto debe ser positivo"),
  montoNeto: z.coerce.number().min(0).optional(),
  montoIva: z.coerce.number().min(0).optional(),
  motivo: z.string().min(1, "Motivo es requerido"),
  estado: z.enum(["EMITIDA", "APLICADA", "REEMBOLSADA", "ANULADA"]).default("EMITIDA"),
  aplicadaAId: z.string().optional(),
  fechaAplicacion: z.string().optional(),
});

export type NotaCreditoInput = z.infer<typeof notaCreditoSchema>;

// ─── Presupuestos Mensuales ──────────────────────────────────────────────────

export const presupuestoSchema = z.object({
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2020),
  categoria: z.enum(categoriasGasto),
  montoPresupuestado: z.coerce.number().positive("Monto debe ser positivo"),
});

export type PresupuestoInput = z.infer<typeof presupuestoSchema>;

// ─── Talleres ─────────────────────────────────────────────────────────────────

export const tiposTaller = ["INTERNO", "EXTERNO"] as const;

export const tallerSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  tipo: z.enum(tiposTaller),
  activo: z.boolean().default(true),
  capacidadDiaria: z.coerce.number().int().min(1).default(10),
  horarioApertura: z.string().optional(),
  horarioCierre: z.string().optional(),
  diasOperacion: z.array(z.string()).optional(),
});

export type TallerInput = z.infer<typeof tallerSchema>;

// ─── Mecánicos ────────────────────────────────────────────────────────────────

export const mecanicoSchema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  tallerId: z.string().min(1, "Taller es requerido"),
  especialidad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  activo: z.boolean().default(true),
  tarifaHora: z.coerce.number().min(0).optional(),
});

export type MecanicoInput = z.infer<typeof mecanicoSchema>;

// ─── Órdenes de Trabajo (Mantenimiento) ───────────────────────────────────────

export const tiposOT = ["PREVENTIVO", "CORRECTIVO", "EMERGENCIA"] as const;

export const ordenMantenimientoSchema = z.object({
  motoId: z.string().min(1, "Moto es requerida"),
  tipoOT: z.enum(tiposOT),
  descripcion: z.string().optional(),
  kmAlIngreso: z.coerce.number().int().min(0, "Km al ingreso es requerido"),
  tallerId: z.string().optional(),
  mecanicoId: z.string().optional(),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "URGENTE"]).optional(),
  fechaProgramada: z.string().optional(),
});

export type OrdenMantenimientoInput = z.infer<typeof ordenMantenimientoSchema>;

// ─── Citas de Mantenimiento ───────────────────────────────────────────────────

export const citaMantenimientoSchema = z.object({
  motoId: z.string().min(1, "Moto es requerida"),
  riderId: z.string().optional(),
  fechaProgramada: z.string().min(1, "Fecha programada es requerida"),
  lugarId: z.string().optional(),
});

export type CitaMantenimientoInput = z.infer<typeof citaMantenimientoSchema>;

// ─── Embarques de Importación ─────────────────────────────────────────────────

export const metodosFleteEmbarque = ["MARITIMO_FCL", "MARITIMO_LCL", "AEREO"] as const;

export const itemEmbarqueSchema = z.object({
  repuestoId: z.string().optional(),
  cantidad: z.coerce.number().int().min(1, "Cantidad mínima es 1"),
  precioFobUnitarioUsd: z.coerce.number().min(0, "Precio FOB debe ser positivo"),
  pesoTotalKg: z.coerce.number().min(0).optional(),
  volumenTotalCbm: z.coerce.number().min(0).optional(),
  ncmCodigo: z.string().optional(),
  arancelPorcentaje: z.coerce.number().min(0).optional(),
});

export const embarqueSchema = z.object({
  proveedorId: z.string().optional(),
  metodoFlete: z.enum(metodosFleteEmbarque),
  fechaSalida: z.string().optional(),
  fechaLlegadaEstimada: z.string().optional(),
  numeroContenedor: z.string().optional(),
  tipoContenedor: z.string().optional(),
  notas: z.string().max(2000, "Notas muy largas").optional(),
  items: z.array(itemEmbarqueSchema).min(1, "Debe tener al menos 1 item"),
});

export type EmbarqueInput = z.infer<typeof embarqueSchema>;
