-- MotoLibre: Expansión ciclo de vida motos de 4 a 12 estados
-- Migración no-destructiva: preserva todos los datos existentes
--
-- ESTRATEGIA:
-- 1. Agregar los nuevos valores al enum (PostgreSQL permite ADD VALUE)
-- 2. Migrar datos: MANTENIMIENTO → EN_SERVICE, BAJA → BAJA_DEFINITIVA
-- 3. Los valores viejos se eliminan SOLO cuando no hay filas con ese valor
-- 4. PostgreSQL no permite DROP VALUE de enum — usamos el workaround estándar

-- ─── STEP 1: Agregar nuevos valores al enum existente ───────────────────────
-- PostgreSQL permite ADD VALUE sin rebuilding la tabla
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'EN_DEPOSITO';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'EN_PATENTAMIENTO';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'RESERVADA';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'EN_SERVICE';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'EN_REPARACION';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'INMOVILIZADA';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'RECUPERACION';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'BAJA_TEMP';
ALTER TYPE "EstadoMoto" ADD VALUE IF NOT EXISTS 'BAJA_DEFINITIVA';

-- ─── STEP 2: Migrar datos existentes ────────────────────────────────────────
-- MANTENIMIENTO → EN_SERVICE
UPDATE "Moto" SET "estado" = 'EN_SERVICE'::"EstadoMoto"
WHERE "estado" = 'MANTENIMIENTO'::"EstadoMoto";

-- BAJA → BAJA_DEFINITIVA
UPDATE "Moto" SET "estado" = 'BAJA_DEFINITIVA'::"EstadoMoto"
WHERE "estado" = 'BAJA'::"EstadoMoto";

-- ─── STEP 3: Reemplazar el enum eliminando valores obsoletos ────────────────
-- PostgreSQL no tiene DROP VALUE, así que usamos el workaround:
-- crear enum nuevo → cambiar columna → drop enum viejo → renombrar

-- 3a. Crear enum temporal con los 12 valores correctos
CREATE TYPE "EstadoMoto_new" AS ENUM (
  'EN_DEPOSITO',
  'EN_PATENTAMIENTO',
  'DISPONIBLE',
  'RESERVADA',
  'ALQUILADA',
  'EN_SERVICE',
  'EN_REPARACION',
  'INMOVILIZADA',
  'RECUPERACION',
  'BAJA_TEMP',
  'BAJA_DEFINITIVA',
  'TRANSFERIDA'
);

-- 3b. Cambiar la columna al nuevo tipo (cast explícito)
ALTER TABLE "Moto"
  ALTER COLUMN "estado" TYPE "EstadoMoto_new"
  USING "estado"::text::"EstadoMoto_new";

-- 3c. Drop del enum viejo
DROP TYPE "EstadoMoto";

-- 3d. Renombrar el nuevo enum al nombre original
ALTER TYPE "EstadoMoto_new" RENAME TO "EstadoMoto";

-- ─── VERIFICACIÓN (logs en Railway) ─────────────────────────────────────────
-- Después del deploy, verificar con:
-- SELECT "estado", COUNT(*) FROM "Moto" GROUP BY "estado";
