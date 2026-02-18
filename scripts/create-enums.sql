-- P14 Schema Hardening: Create enum types and convert String columns
-- Run BEFORE prisma db push

-- Create enum types (only if they don't exist)
DO $$ BEGIN CREATE TYPE "EstadoCliente" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoMoto" AS ENUM ('DISPONIBLE', 'ALQUILADA', 'MANTENIMIENTO', 'BAJA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoMoto" AS ENUM ('NAKED', 'TOURING', 'SPORT', 'SCOOTER', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoLegalMoto" AS ENUM ('REGULAR', 'DENUNCIA_ROBO', 'SINIESTRO_TOTAL', 'BAJA_DEFINITIVA', 'EN_PROCESO_PATENTAMIENTO', 'PRENDA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoPatentamiento" AS ENUM ('SIN_PATENTAR', 'EN_TRAMITE', 'PATENTADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoSeguro" AS ENUM ('SIN_SEGURO', 'EN_TRAMITE', 'ASEGURADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoCobertura" AS ENUM ('RESPONSABILIDAD_CIVIL', 'TERCEROS_COMPLETO', 'TODO_RIESGO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MetodoAmortizacion" AS ENUM ('LINEAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FrecuenciaPago" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoContrato" AS ENUM ('PENDIENTE', 'ACTIVO', 'FINALIZADO', 'CANCELADO', 'FINALIZADO_COMPRA', 'VENCIDO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'MERCADOPAGO', 'PENDIENTE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO', 'CANCELADO', 'VENCIDO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoAusencia" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SexoEmpleado" AS ENUM ('M', 'F', 'X'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_CONVIVENCIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Departamento" AS ENUM ('OPERACIONES', 'ADMINISTRACION', 'COMERCIAL', 'TALLER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "JornadaLaboral" AS ENUM ('COMPLETA', 'PARCIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoDocumentoEmpleado" AS ENUM ('DNI', 'CUIL', 'CONTRATO', 'ALTA_AFIP', 'ART', 'CV', 'CERTIFICADO', 'OTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoDocumentoMoto" AS ENUM ('CEDULA_VERDE', 'CEDULA_AZUL', 'TITULO', 'POLIZA', 'VTV', 'DESPACHO_IMPORTACION', 'FACTURA_COMPRA', 'VERIFICACION_POLICIAL', 'FORMULARIO_01', 'FORMULARIO_12', 'CERTIFICADO_IMPORTACION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoBaja" AS ENUM ('ROBO', 'SINIESTRO', 'VENTA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FormaPagoBaja" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoNotaCredito" AS ENUM ('DEVOLUCION_TOTAL', 'DEVOLUCION_PARCIAL', 'DESCUENTO', 'AJUSTE_PRECIO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoNotaCredito" AS ENUM ('EMITIDA', 'APLICADA', 'REEMBOLSADA', 'ANULADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoBusinessEvent" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoCuentaBancaria" AS ENUM ('CC_PESOS', 'CA_PESOS', 'CC_USD', 'CA_USD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoMovimientoBancario" AS ENUM ('CREDITO', 'DEBITO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoExtracto" AS ENUM ('PENDIENTE', 'CONCILIADO', 'NO_CONCILIADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoConciliacion" AS ENUM ('EN_PROCESO', 'COMPLETADA', 'REVISION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoMatch" AS ENUM ('AUTO_EXACTO', 'AUTO_APROXIMADO', 'MANUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoAnomalia" AS ENUM ('GASTO_INUSUAL', 'PAGO_DUPLICADO', 'FACTURA_SIN_PAGO', 'MARGEN_BAJO', 'STOCK_CRITICO', 'PATRON_SOSPECHOSO', 'DESVIO_PRESUPUESTO', 'CONCILIACION_PENDIENTE', 'VENCIMIENTO_PROXIMO', 'FLUJO_CAJA_NEGATIVO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SeveridadAnomalia" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoAnomalia" AS ENUM ('NUEVA', 'EN_REVISION', 'RESUELTA', 'DESCARTADA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "GranularidadMetrica" AS ENUM ('HORA', 'DIA', 'SEMANA', 'MES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "StatusEventBus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 2: Drop ALL defaults BEFORE changing types (prevents cast errors)
ALTER TABLE "Cliente" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "estadoLegal" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "estadoPatentamiento" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "estadoSeguro" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "metodoAmortizacion" DROP DEFAULT;
ALTER TABLE "Contrato" ALTER COLUMN "frecuenciaPago" DROP DEFAULT;
ALTER TABLE "Contrato" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Pago" ALTER COLUMN "metodo" DROP DEFAULT;
ALTER TABLE "Pago" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Ausencia" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Empleado" ALTER COLUMN "jornadaLaboral" DROP DEFAULT;
ALTER TABLE "NotaCredito" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "BusinessEvent" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ExtractoBancario" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Conciliacion" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Anomalia" ALTER COLUMN "estado" DROP DEFAULT;

-- Step 3: Alter columns to use enum types (with USING cast)
ALTER TABLE "Cliente" ALTER COLUMN "estado" TYPE "EstadoCliente" USING "estado"::"EstadoCliente";
ALTER TABLE "Moto" ALTER COLUMN "estado" TYPE "EstadoMoto" USING "estado"::"EstadoMoto";
ALTER TABLE "Moto" ALTER COLUMN "tipo" TYPE "TipoMoto" USING "tipo"::"TipoMoto";
ALTER TABLE "Moto" ALTER COLUMN "estadoLegal" TYPE "EstadoLegalMoto" USING "estadoLegal"::"EstadoLegalMoto";
ALTER TABLE "Moto" ALTER COLUMN "estadoPatentamiento" TYPE "EstadoPatentamiento" USING "estadoPatentamiento"::"EstadoPatentamiento";
ALTER TABLE "Moto" ALTER COLUMN "estadoSeguro" TYPE "EstadoSeguro" USING "estadoSeguro"::"EstadoSeguro";
ALTER TABLE "Moto" ALTER COLUMN "tipoCobertura" TYPE "TipoCobertura" USING "tipoCobertura"::"TipoCobertura";
ALTER TABLE "Moto" ALTER COLUMN "metodoAmortizacion" TYPE "MetodoAmortizacion" USING "metodoAmortizacion"::"MetodoAmortizacion";
ALTER TABLE "Contrato" ALTER COLUMN "frecuenciaPago" TYPE "FrecuenciaPago" USING "frecuenciaPago"::"FrecuenciaPago";
ALTER TABLE "Contrato" ALTER COLUMN "estado" TYPE "EstadoContrato" USING "estado"::"EstadoContrato";
ALTER TABLE "Pago" ALTER COLUMN "metodo" TYPE "MetodoPago" USING "metodo"::"MetodoPago";
ALTER TABLE "Pago" ALTER COLUMN "estado" TYPE "EstadoPago" USING "estado"::"EstadoPago";
ALTER TABLE "Ausencia" ALTER COLUMN "estado" TYPE "EstadoAusencia" USING "estado"::"EstadoAusencia";
ALTER TABLE "Empleado" ALTER COLUMN "sexo" TYPE "SexoEmpleado" USING "sexo"::"SexoEmpleado";
ALTER TABLE "Empleado" ALTER COLUMN "estadoCivil" TYPE "EstadoCivil" USING "estadoCivil"::"EstadoCivil";
ALTER TABLE "Empleado" ALTER COLUMN "departamento" TYPE "Departamento" USING "departamento"::"Departamento";
ALTER TABLE "Empleado" ALTER COLUMN "jornadaLaboral" TYPE "JornadaLaboral" USING "jornadaLaboral"::"JornadaLaboral";
ALTER TABLE "DocumentoEmpleado" ALTER COLUMN "tipo" TYPE "TipoDocumentoEmpleado" USING "tipo"::"TipoDocumentoEmpleado";
ALTER TABLE "DocumentoMoto" ALTER COLUMN "tipo" TYPE "TipoDocumentoMoto" USING "tipo"::"TipoDocumentoMoto";
ALTER TABLE "BajaMoto" ALTER COLUMN "tipoBaja" TYPE "TipoBaja" USING "tipoBaja"::"TipoBaja";
ALTER TABLE "BajaMoto" ALTER COLUMN "formaPago" TYPE "FormaPagoBaja" USING "formaPago"::"FormaPagoBaja";
ALTER TABLE "NotaCredito" ALTER COLUMN "tipo" TYPE "TipoNotaCredito" USING "tipo"::"TipoNotaCredito";
ALTER TABLE "NotaCredito" ALTER COLUMN "estado" TYPE "EstadoNotaCredito" USING "estado"::"EstadoNotaCredito";
ALTER TABLE "BusinessEvent" ALTER COLUMN "status" TYPE "EstadoBusinessEvent" USING "status"::"EstadoBusinessEvent";
ALTER TABLE "CuentaBancaria" ALTER COLUMN "tipoCuenta" TYPE "TipoCuentaBancaria" USING "tipoCuenta"::"TipoCuentaBancaria";
ALTER TABLE "ExtractoBancario" ALTER COLUMN "tipo" TYPE "TipoMovimientoBancario" USING "tipo"::"TipoMovimientoBancario";
ALTER TABLE "ExtractoBancario" ALTER COLUMN "estado" TYPE "EstadoExtracto" USING "estado"::"EstadoExtracto";
ALTER TABLE "Conciliacion" ALTER COLUMN "estado" TYPE "EstadoConciliacion" USING "estado"::"EstadoConciliacion";
ALTER TABLE "ConciliacionMatch" ALTER COLUMN "tipoMatch" TYPE "TipoMatch" USING "tipoMatch"::"TipoMatch";
ALTER TABLE "Anomalia" ALTER COLUMN "tipo" TYPE "TipoAnomalia" USING "tipo"::"TipoAnomalia";
ALTER TABLE "Anomalia" ALTER COLUMN "severidad" TYPE "SeveridadAnomalia" USING "severidad"::"SeveridadAnomalia";
ALTER TABLE "Anomalia" ALTER COLUMN "estado" TYPE "EstadoAnomalia" USING "estado"::"EstadoAnomalia";
ALTER TABLE "EventMetric" ALTER COLUMN "granularidad" TYPE "GranularidadMetrica" USING "granularidad"::"GranularidadMetrica";
ALTER TABLE "SystemHealth" ALTER COLUMN "eventBusStatus" TYPE "StatusEventBus" USING "eventBusStatus"::"StatusEventBus";

-- Step 4: Re-add defaults with proper enum casts
ALTER TABLE "Cliente" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE'::"EstadoCliente";
ALTER TABLE "Moto" ALTER COLUMN "estado" SET DEFAULT 'DISPONIBLE'::"EstadoMoto";
ALTER TABLE "Moto" ALTER COLUMN "estadoLegal" SET DEFAULT 'REGULAR'::"EstadoLegalMoto";
ALTER TABLE "Moto" ALTER COLUMN "estadoPatentamiento" SET DEFAULT 'SIN_PATENTAR'::"EstadoPatentamiento";
ALTER TABLE "Moto" ALTER COLUMN "estadoSeguro" SET DEFAULT 'SIN_SEGURO'::"EstadoSeguro";
ALTER TABLE "Moto" ALTER COLUMN "metodoAmortizacion" SET DEFAULT 'LINEAL'::"MetodoAmortizacion";
ALTER TABLE "Contrato" ALTER COLUMN "frecuenciaPago" SET DEFAULT 'MENSUAL'::"FrecuenciaPago";
ALTER TABLE "Contrato" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE'::"EstadoContrato";
ALTER TABLE "Pago" ALTER COLUMN "metodo" SET DEFAULT 'PENDIENTE'::"MetodoPago";
ALTER TABLE "Pago" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE'::"EstadoPago";
ALTER TABLE "Ausencia" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE'::"EstadoAusencia";
ALTER TABLE "Empleado" ALTER COLUMN "jornadaLaboral" SET DEFAULT 'COMPLETA'::"JornadaLaboral";
ALTER TABLE "NotaCredito" ALTER COLUMN "estado" SET DEFAULT 'EMITIDA'::"EstadoNotaCredito";
ALTER TABLE "BusinessEvent" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"EstadoBusinessEvent";
ALTER TABLE "ExtractoBancario" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE'::"EstadoExtracto";
ALTER TABLE "Conciliacion" ALTER COLUMN "estado" SET DEFAULT 'EN_PROCESO'::"EstadoConciliacion";
ALTER TABLE "Anomalia" ALTER COLUMN "estado" SET DEFAULT 'NUEVA'::"EstadoAnomalia";

-- Step 5: Remove deprecated field
ALTER TABLE "Moto" DROP COLUMN IF EXISTS "vencimientoPoliza";

-- Step 6: Drop orphan table
DROP TABLE IF EXISTS "CategoriaRepuestoConfig";

-- Step 7: Change caeVencimiento from String to DateTime in Factura
ALTER TABLE "Factura" ALTER COLUMN "caeVencimiento" TYPE TIMESTAMP USING CASE WHEN "caeVencimiento" IS NULL THEN NULL WHEN "caeVencimiento" ~ '^\d{4}-\d{2}-\d{2}' THEN "caeVencimiento"::TIMESTAMP ELSE NULL END;

-- Step 8: Add unique constraints (only if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Factura_numero_key') THEN
    ALTER TABLE "Factura" ADD CONSTRAINT "Factura_numero_key" UNIQUE ("numero");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Pago_mpPaymentId_key') THEN
    ALTER TABLE "Pago" ADD CONSTRAINT "Pago_mpPaymentId_key" UNIQUE ("mpPaymentId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Moto_numeroPoliza_key') THEN
    ALTER TABLE "Moto" ADD CONSTRAINT "Moto_numeroPoliza_key" UNIQUE ("numeroPoliza");
  END IF;
END $$;
