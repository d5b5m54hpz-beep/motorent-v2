import { addDays, addMonths, differenceInDays, differenceInMonths } from "date-fns";

type FrecuenciaPago = "SEMANAL" | "QUINCENAL" | "MENSUAL";

type PricingConfig = {
  precioBaseMensual: number;
  descuentoSemanal: number;
  descuentoMeses3: number;
  descuentoMeses6: number;
  descuentoMeses9: number;
  descuentoMeses12: number;
};

/**
 * Calcula el número de períodos entre dos fechas según la frecuencia de pago
 */
export function calcularPeriodos(
  fechaInicio: Date,
  fechaFin: Date,
  frecuencia: FrecuenciaPago
): number {
  const dias = differenceInDays(fechaFin, fechaInicio);

  switch (frecuencia) {
    case "SEMANAL":
      return Math.ceil(dias / 7);
    case "QUINCENAL":
      return Math.ceil(dias / 15);
    case "MENSUAL":
      return differenceInMonths(fechaFin, fechaInicio) || 1;
    default:
      return 1;
  }
}

/**
 * Calcula las fechas de vencimiento para cada período
 */
export function generarFechasVencimiento(
  fechaInicio: Date,
  periodos: number,
  frecuencia: FrecuenciaPago
): Date[] {
  const fechas: Date[] = [];

  for (let i = 0; i < periodos; i++) {
    let fecha: Date;
    switch (frecuencia) {
      case "SEMANAL":
        fecha = addDays(fechaInicio, (i + 1) * 7);
        break;
      case "QUINCENAL":
        fecha = addDays(fechaInicio, (i + 1) * 15);
        break;
      case "MENSUAL":
        fecha = addMonths(fechaInicio, i + 1);
        break;
      default:
        fecha = addMonths(fechaInicio, i + 1);
    }
    fechas.push(fecha);
  }

  return fechas;
}

/**
 * Calcula el descuento por duración según PricingConfig
 */
export function calcularDescuentoDuracion(
  meses: number,
  pricingConfig: PricingConfig
): number {
  if (meses >= 12) return pricingConfig.descuentoMeses12;
  if (meses >= 9) return pricingConfig.descuentoMeses9;
  if (meses >= 6) return pricingConfig.descuentoMeses6;
  if (meses >= 3) return pricingConfig.descuentoMeses3;
  return 0;
}

/**
 * Calcula el precio del contrato con todos los descuentos aplicados
 */
export function calcularPreciosContrato(
  precioBaseMensual: number,
  fechaInicio: Date,
  fechaFin: Date,
  frecuencia: FrecuenciaPago,
  pricingConfig: PricingConfig
): {
  periodos: number;
  meses: number;
  descuentoDuracion: number;
  descuentoFrecuencia: number;
  descuentoTotal: number;
  precioMensualConDescuento: number;
  montoPeriodo: number;
  montoTotal: number;
} {
  const periodos = calcularPeriodos(fechaInicio, fechaFin, frecuencia);
  const meses = differenceInMonths(fechaFin, fechaInicio) || 1;

  // Descuento por duración
  const descuentoDuracion = calcularDescuentoDuracion(meses, pricingConfig);

  // Descuento por frecuencia (solo semanal/quincenal)
  const descuentoFrecuencia = frecuencia === "SEMANAL" || frecuencia === "QUINCENAL"
    ? pricingConfig.descuentoSemanal
    : 0;

  // Descuento total combinado
  const descuentoTotal = descuentoDuracion + descuentoFrecuencia;

  // Precio mensual con descuento
  const precioMensualConDescuento = precioBaseMensual * (1 - descuentoTotal / 100);

  // Monto por período según frecuencia
  let montoPeriodo: number;
  switch (frecuencia) {
    case "SEMANAL":
      montoPeriodo = precioMensualConDescuento / 4; // ~4 semanas por mes
      break;
    case "QUINCENAL":
      montoPeriodo = precioMensualConDescuento / 2;
      break;
    case "MENSUAL":
      montoPeriodo = precioMensualConDescuento;
      break;
    default:
      montoPeriodo = precioMensualConDescuento;
  }

  // Monto total del contrato
  const montoTotal = montoPeriodo * periodos;

  return {
    periodos,
    meses,
    descuentoDuracion,
    descuentoFrecuencia,
    descuentoTotal,
    precioMensualConDescuento,
    montoPeriodo: Math.round(montoPeriodo),
    montoTotal: Math.round(montoTotal),
  };
}
