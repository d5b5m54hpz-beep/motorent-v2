/**
 * CONTROLES INTERNOS - Nivel Big 4 / Auditoría EY
 * Funciones de validación para asegurar integridad de datos en facturas de compra
 */

import crypto from "crypto";
import type { CondicionIva, TipoFacturaCompra } from "@prisma/client";

// ─── VALIDACIÓN DE CUIT ─────────────────────────────────────────────────────

/**
 * Valida el formato y dígito verificador del CUIT argentino
 * Algoritmo: Módulo 11
 */
export function validarCUIT(cuit: string): { valido: boolean; error?: string } {
  if (!cuit) {
    return { valido: false, error: "CUIT vacío" };
  }

  const clean = cuit.replace(/[-\s]/g, "");

  if (clean.length !== 11) {
    return { valido: false, error: "CUIT debe tener 11 dígitos" };
  }

  if (!/^\d+$/.test(clean)) {
    return { valido: false, error: "CUIT solo debe contener números" };
  }

  // Validar dígito verificador
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean[i]) * mult[i];
  }

  const mod = sum % 11;
  const verificador = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod;
  const digitoVerificador = parseInt(clean[10]);

  if (verificador !== digitoVerificador) {
    return {
      valido: false,
      error: `Dígito verificador incorrecto. Esperado: ${verificador}, recibido: ${digitoVerificador}`,
    };
  }

  return { valido: true };
}

// ─── VALIDACIÓN MATEMÁTICA ──────────────────────────────────────────────────

export type ValidacionMatematica = {
  valido: boolean;
  errores: string[];
  warnings: string[];
  totalCalculado: number;
  diferencia: number;
};

/**
 * Valida que los montos de IVA y percepciones cuadren con el total
 * Tolerancia: $0.99 por redondeos
 */
export function validarMontosFactura(data: {
  subtotal: number;
  iva21: number;
  iva105: number;
  iva27: number;
  percepcionIVA: number;
  percepcionIIBB: number;
  impInterno: number;
  noGravado: number;
  exento: number;
  total: number;
}): ValidacionMatematica {
  const errores: string[] = [];
  const warnings: string[] = [];

  const totalCalculado =
    data.subtotal +
    data.iva21 +
    data.iva105 +
    data.iva27 +
    data.percepcionIVA +
    data.percepcionIIBB +
    data.impInterno +
    data.noGravado +
    data.exento;

  const diferencia = Math.abs(totalCalculado - data.total);

  // Tolerancia de $0.99 por redondeos
  if (diferencia > 0.99) {
    errores.push(
      `Los montos no cuadran. Total calculado: $${totalCalculado.toFixed(
        2
      )}, Total declarado: $${data.total.toFixed(2)}. Diferencia: $${diferencia.toFixed(2)}`
    );
  }

  // Validar que IVA 21% sea aproximadamente 21% del gravado
  if (data.iva21 > 0) {
    const netoGravado21 = data.iva21 / 0.21;
    if (Math.abs(netoGravado21 - (data.subtotal - data.noGravado - data.exento)) > 1) {
      warnings.push(
        `IVA 21% ($${data.iva21.toFixed(2)}) no corresponde con el neto gravado estimado`
      );
    }
  }

  // Validar que IVA 10.5% sea aproximadamente 10.5% del gravado
  if (data.iva105 > 0) {
    const netoGravado105 = data.iva105 / 0.105;
    warnings.push(
      `IVA 10.5% ($${data.iva105.toFixed(2)}) corresponde a un neto de $${netoGravado105.toFixed(2)}`
    );
  }

  // Validar que IVA 27% sea aproximadamente 27% del gravado
  if (data.iva27 > 0) {
    const netoGravado27 = data.iva27 / 0.27;
    warnings.push(
      `IVA 27% ($${data.iva27.toFixed(2)}) corresponde a un neto de $${netoGravado27.toFixed(2)}`
    );
  }

  // Validar que el total sea mayor a 0
  if (data.total <= 0) {
    errores.push("El total debe ser mayor a 0");
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    totalCalculado,
    diferencia,
  };
}

// ─── VALIDACIÓN DE FECHAS ───────────────────────────────────────────────────

export type ValidacionFechas = {
  valido: boolean;
  errores: string[];
  warnings: string[];
};

export function validarFechasFactura(data: {
  fechaEmision: Date;
  fechaVencimiento?: Date | null;
  caeVencimiento?: Date | null;
}): ValidacionFechas {
  const errores: string[] = [];
  const warnings: string[] = [];
  const ahora = new Date();
  const hace12Meses = new Date();
  hace12Meses.setMonth(hace12Meses.getMonth() - 12);

  // Fecha de emisión no puede ser futura
  if (data.fechaEmision > ahora) {
    errores.push("La fecha de emisión no puede ser futura");
  }

  // Warning si factura es muy vieja (más de 12 meses)
  if (data.fechaEmision < hace12Meses) {
    warnings.push("La factura tiene más de 12 meses de antigüedad");
  }

  // Fecha de vencimiento no puede ser anterior a fecha de emisión
  if (data.fechaVencimiento && data.fechaVencimiento < data.fechaEmision) {
    errores.push("La fecha de vencimiento no puede ser anterior a la fecha de emisión");
  }

  // CAE vencimiento debe ser posterior a fecha de emisión
  if (data.caeVencimiento && data.caeVencimiento < data.fechaEmision) {
    errores.push("La fecha de vencimiento del CAE no puede ser anterior a la fecha de emisión");
  }

  // Warning si ya está vencida
  if (data.fechaVencimiento && data.fechaVencimiento < ahora) {
    warnings.push("La factura está vencida");
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
  };
}

// ─── VALIDACIÓN DE TIPO DE COMPROBANTE ──────────────────────────────────────

export type ValidacionTipoComprobante = {
  valido: boolean;
  errores: string[];
  warnings: string[];
  tipoEsperado?: TipoFacturaCompra;
};

/**
 * Valida que el tipo de comprobante sea correcto según las condiciones de IVA
 * Reglas AFIP:
 * - RI → RI: Factura A
 * - RI → Monotributista: Factura C
 * - RI → Exento: Factura C
 * - RI → Consumidor Final: Factura B
 */
export function validarTipoComprobante(data: {
  condicionIvaEmisor: CondicionIva;
  condicionIvaReceptor: CondicionIva;
  tipoComprobante: TipoFacturaCompra;
}): ValidacionTipoComprobante {
  const errores: string[] = [];
  const warnings: string[] = [];
  let tipoEsperado: TipoFacturaCompra | undefined;

  const { condicionIvaEmisor, condicionIvaReceptor, tipoComprobante } = data;

  // Si emisor es Responsable Inscripto
  if (condicionIvaEmisor === "RESPONSABLE_INSCRIPTO") {
    if (condicionIvaReceptor === "RESPONSABLE_INSCRIPTO") {
      tipoEsperado = "A";
      if (tipoComprobante !== "A") {
        warnings.push(
          `Tipo de factura incorrecto. Esperado: Factura A (RI → RI), recibido: ${tipoComprobante}`
        );
      }
    } else if (
      condicionIvaReceptor === "MONOTRIBUTISTA" ||
      condicionIvaReceptor === "EXENTO"
    ) {
      tipoEsperado = "C";
      if (tipoComprobante !== "C") {
        warnings.push(
          `Tipo de factura incorrecto. Esperado: Factura C (RI → Monotributista/Exento), recibido: ${tipoComprobante}`
        );
      }
    } else if (condicionIvaReceptor === "CONSUMIDOR_FINAL") {
      tipoEsperado = "B";
      if (tipoComprobante !== "B") {
        warnings.push(
          `Tipo de factura incorrecto. Esperado: Factura B (RI → Consumidor Final), recibido: ${tipoComprobante}`
        );
      }
    }
  }

  // Si emisor es Monotributista, solo puede emitir Factura C
  if (condicionIvaEmisor === "MONOTRIBUTISTA") {
    tipoEsperado = "C";
    if (tipoComprobante !== "C" && tipoComprobante !== "TICKET") {
      warnings.push(
        `Los monotributistas solo pueden emitir Factura C o Ticket, recibido: ${tipoComprobante}`
      );
    }
  }

  return {
    valido: errores.length === 0,
    errores,
    warnings,
    tipoEsperado,
  };
}

// ─── GENERACIÓN DE HASH ÚNICO ───────────────────────────────────────────────

/**
 * Genera un hash único para identificar facturas duplicadas
 * Usa: CUIT + Tipo + PuntoVenta + Numero
 */
export function generarHashFactura(data: {
  cuit: string | null;
  tipo: TipoFacturaCompra;
  puntoVenta: string | null;
  numero: string;
}): string {
  const cuit = data.cuit?.replace(/[-\s]/g, "") || "SIN_CUIT";
  const pv = data.puntoVenta || "0000";
  const numero = data.numero.trim();

  const str = `${cuit}_${data.tipo}_${pv}_${numero}`;
  return crypto.createHash("sha256").update(str).digest("hex");
}

// ─── DETECCIÓN DE DUPLICADOS ────────────────────────────────────────────────

export type DeteccionDuplicado = {
  esDuplicadoExacto: boolean;
  esDuplicadoSospechoso: boolean;
  mensajes: string[];
};

/**
 * Detecta posibles duplicados basado en múltiples criterios
 */
export function detectarDuplicado(
  facturaExistente: {
    id: string;
    cuit: string | null;
    tipo: TipoFacturaCompra;
    puntoVenta: string | null;
    numero: string;
    total: number;
    fecha: Date;
    cae: string | null;
  },
  facturaNueva: {
    cuit: string | null;
    tipo: TipoFacturaCompra;
    puntoVenta: string | null;
    numero: string;
    total: number;
    fecha: Date;
    cae?: string | null;
  }
): DeteccionDuplicado {
  const mensajes: string[] = [];
  let esDuplicadoExacto = false;
  let esDuplicadoSospechoso = false;

  // 1. Duplicado exacto por CUIT + Tipo + PV + Número
  if (
    facturaExistente.cuit === facturaNueva.cuit &&
    facturaExistente.tipo === facturaNueva.tipo &&
    facturaExistente.puntoVenta === facturaNueva.puntoVenta &&
    facturaExistente.numero === facturaNueva.numero
  ) {
    esDuplicadoExacto = true;
    mensajes.push(
      `⛔ DUPLICADO EXACTO: Esta factura ya está registrada (ID: ${facturaExistente.id.slice(0, 8)})`
    );
  }

  // 2. Mismo CAE (CAE es único por comprobante)
  if (facturaExistente.cae && facturaNueva.cae && facturaExistente.cae === facturaNueva.cae) {
    esDuplicadoExacto = true;
    mensajes.push(
      `⛔ CAE DUPLICADO: El CAE ${facturaExistente.cae} ya está registrado en otra factura`
    );
  }

  // 3. Mismo CUIT + monto similar + fecha cercana (±5 días)
  if (facturaExistente.cuit === facturaNueva.cuit) {
    const diferenciaMontos = Math.abs(facturaExistente.total - facturaNueva.total);
    const diferenciaDias = Math.abs(
      facturaExistente.fecha.getTime() - new Date(facturaNueva.fecha).getTime()
    ) / (1000 * 60 * 60 * 24);

    if (diferenciaMontos < 1 && diferenciaDias <= 5) {
      esDuplicadoSospechoso = true;
      mensajes.push(
        `⚠️ SOSPECHA DE DUPLICADO: Mismo proveedor, monto similar ($${facturaExistente.total.toFixed(2)}) y fecha cercana (${diferenciaDias.toFixed(0)} días de diferencia)`
      );
    }
  }

  // 4. Mismo número pero diferente CUIT (informativo)
  if (
    facturaExistente.numero === facturaNueva.numero &&
    facturaExistente.cuit !== facturaNueva.cuit
  ) {
    mensajes.push(
      `ℹ️ INFORMACIÓN: Existe una factura con el mismo número pero de otro proveedor`
    );
  }

  return {
    esDuplicadoExacto,
    esDuplicadoSospechoso,
    mensajes,
  };
}

// ─── VALIDACIÓN DE TRANSICIÓN DE ESTADO ────────────────────────────────────

export type ValidacionTransicionEstado = {
  permitido: boolean;
  error?: string;
};

/**
 * Valida que la transición de estado sea permitida
 * Workflow:
 * BORRADOR → PENDIENTE_REVISION → APROBADA → PAGADA
 *                              ↓
 *                         RECHAZADA / ANULADA
 */
export function validarTransicionEstado(
  estadoActual: string,
  estadoNuevo: string,
  userRole: string
): ValidacionTransicionEstado {
  const transicionesPermitidas: Record<string, { siguientes: string[]; rolesPermitidos: string[] }> = {
    BORRADOR: {
      siguientes: ["PENDIENTE_REVISION", "ANULADA"],
      rolesPermitidos: ["ADMIN", "OPERADOR", "CONTADOR"],
    },
    PENDIENTE_REVISION: {
      siguientes: ["APROBADA", "RECHAZADA", "BORRADOR"],
      rolesPermitidos: ["ADMIN", "CONTADOR"],
    },
    APROBADA: {
      siguientes: ["PAGADA", "PAGADA_PARCIAL", "ANULADA"],
      rolesPermitidos: ["ADMIN", "CONTADOR", "OPERADOR"],
    },
    RECHAZADA: {
      siguientes: ["BORRADOR"],
      rolesPermitidos: ["ADMIN"],
    },
    PAGADA: {
      siguientes: [],
      rolesPermitidos: [],
    },
    PAGADA_PARCIAL: {
      siguientes: ["PAGADA", "ANULADA"],
      rolesPermitidos: ["ADMIN", "CONTADOR", "OPERADOR"],
    },
    VENCIDA: {
      siguientes: ["PAGADA", "PAGADA_PARCIAL", "ANULADA"],
      rolesPermitidos: ["ADMIN", "CONTADOR", "OPERADOR"],
    },
    ANULADA: {
      siguientes: [],
      rolesPermitidos: [],
    },
  };

  const config = transicionesPermitidas[estadoActual];

  if (!config) {
    return {
      permitido: false,
      error: `Estado actual desconocido: ${estadoActual}`,
    };
  }

  if (!config.siguientes.includes(estadoNuevo)) {
    return {
      permitido: false,
      error: `No se puede cambiar de ${estadoActual} a ${estadoNuevo}`,
    };
  }

  if (!config.rolesPermitidos.includes(userRole)) {
    return {
      permitido: false,
      error: `Tu rol (${userRole}) no tiene permisos para cambiar este estado`,
    };
  }

  return { permitido: true };
}
