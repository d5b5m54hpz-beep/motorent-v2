-- P14 Schema Hardening: Normalize all lowercase string values to UPPERCASE
-- Run BEFORE prisma db push to ensure enum compatibility

-- Rental domain (currently lowercase)
UPDATE "Cliente" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "Moto" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "Moto" SET tipo = UPPER(tipo) WHERE tipo IS NOT NULL AND tipo != UPPER(tipo);
UPDATE "Contrato" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "Contrato" SET "frecuenciaPago" = UPPER("frecuenciaPago") WHERE "frecuenciaPago" != UPPER("frecuenciaPago");
UPDATE "Pago" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "Pago" SET metodo = UPPER(metodo) WHERE metodo != UPPER(metodo);

-- Fix known bug: "pagado" should be "APROBADO" in Pago.estado
UPDATE "Pago" SET estado = 'APROBADO' WHERE estado = 'PAGADO';

-- Administrative domain (safety net — likely already UPPERCASE)
UPDATE "Moto" SET "estadoLegal" = UPPER("estadoLegal") WHERE "estadoLegal" IS NOT NULL AND "estadoLegal" != UPPER("estadoLegal");
UPDATE "Moto" SET "estadoPatentamiento" = UPPER("estadoPatentamiento") WHERE "estadoPatentamiento" IS NOT NULL AND "estadoPatentamiento" != UPPER("estadoPatentamiento");
UPDATE "Moto" SET "estadoSeguro" = UPPER("estadoSeguro") WHERE "estadoSeguro" IS NOT NULL AND "estadoSeguro" != UPPER("estadoSeguro");
UPDATE "Moto" SET "tipoCobertura" = UPPER("tipoCobertura") WHERE "tipoCobertura" IS NOT NULL AND "tipoCobertura" != UPPER("tipoCobertura");
UPDATE "Moto" SET "metodoAmortizacion" = UPPER("metodoAmortizacion") WHERE "metodoAmortizacion" IS NOT NULL AND "metodoAmortizacion" != UPPER("metodoAmortizacion");
UPDATE "Empleado" SET sexo = UPPER(sexo) WHERE sexo IS NOT NULL AND sexo != UPPER(sexo);
UPDATE "Empleado" SET "estadoCivil" = UPPER("estadoCivil") WHERE "estadoCivil" IS NOT NULL AND "estadoCivil" != UPPER("estadoCivil");
UPDATE "Empleado" SET departamento = UPPER(departamento) WHERE departamento IS NOT NULL AND departamento != UPPER(departamento);
UPDATE "Empleado" SET "jornadaLaboral" = UPPER("jornadaLaboral") WHERE "jornadaLaboral" IS NOT NULL AND "jornadaLaboral" != UPPER("jornadaLaboral");
UPDATE "Ausencia" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "BajaMoto" SET "tipoBaja" = UPPER("tipoBaja") WHERE "tipoBaja" != UPPER("tipoBaja");
UPDATE "BajaMoto" SET "formaPago" = UPPER("formaPago") WHERE "formaPago" IS NOT NULL AND "formaPago" != UPPER("formaPago");
UPDATE "NotaCredito" SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo);
UPDATE "NotaCredito" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "DocumentoMoto" SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo);
UPDATE "DocumentoEmpleado" SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo);
UPDATE "ExtractoBancario" SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo);
UPDATE "ExtractoBancario" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "Conciliacion" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "ConciliacionMatch" SET "tipoMatch" = UPPER("tipoMatch") WHERE "tipoMatch" != UPPER("tipoMatch");
UPDATE "Anomalia" SET tipo = UPPER(tipo) WHERE tipo != UPPER(tipo);
UPDATE "Anomalia" SET severidad = UPPER(severidad) WHERE severidad != UPPER(severidad);
UPDATE "Anomalia" SET estado = UPPER(estado) WHERE estado != UPPER(estado);
UPDATE "EventMetric" SET granularidad = UPPER(granularidad) WHERE granularidad != UPPER(granularidad);
UPDATE "SystemHealth" SET "eventBusStatus" = UPPER("eventBusStatus") WHERE "eventBusStatus" != UPPER("eventBusStatus");
UPDATE "BusinessEvent" SET status = UPPER(status) WHERE status != UPPER(status);
UPDATE "CuentaBancaria" SET "tipoCuenta" = UPPER("tipoCuenta") WHERE "tipoCuenta" != UPPER("tipoCuenta");
