-- MotoLibre: ItemOT — costos reales de mantenimiento por OT
-- Migración aditiva: solo agrega, no modifica datos existentes

-- ─── STEP 1: Nuevo enum TipoItemOT ──────────────────────────────────────────
CREATE TYPE "TipoItemOT" AS ENUM (
  'REPUESTO',
  'MANO_OBRA',
  'INSUMO'
);

-- ─── STEP 2: Nuevo modelo ItemOT ────────────────────────────────────────────
CREATE TABLE "ItemOT" (
  "id"              TEXT NOT NULL,
  "ordenTrabajoId"  TEXT NOT NULL,
  "tipo"            "TipoItemOT" NOT NULL,
  "descripcion"     TEXT NOT NULL,
  "repuestoId"      TEXT,
  "cantidad"        DECIMAL(10,3) NOT NULL,
  "precioUnitario"  DECIMAL(12,2) NOT NULL,
  "subtotal"        DECIMAL(12,2) NOT NULL,
  "horasMecanico"   DECIMAL(6,2),
  "tarifaHora"      DECIMAL(12,2),
  "creadoPor"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ItemOT_pkey" PRIMARY KEY ("id")
);

-- ─── STEP 3: Foreign keys ────────────────────────────────────────────────────
ALTER TABLE "ItemOT"
  ADD CONSTRAINT "ItemOT_ordenTrabajoId_fkey"
  FOREIGN KEY ("ordenTrabajoId")
  REFERENCES "OrdenTrabajo"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemOT"
  ADD CONSTRAINT "ItemOT_repuestoId_fkey"
  FOREIGN KEY ("repuestoId")
  REFERENCES "Repuesto"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── STEP 4: Índices ─────────────────────────────────────────────────────────
CREATE INDEX "ItemOT_ordenTrabajoId_idx" ON "ItemOT"("ordenTrabajoId");
CREATE INDEX "ItemOT_repuestoId_idx" ON "ItemOT"("repuestoId");

-- ─── STEP 5: Inicializar costoTotal con valor histórico de costoManoObra ─────
-- costoTotal ya existe en OrdenTrabajo (campo previo), solo actualizamos OTs sin datos
UPDATE "OrdenTrabajo"
SET "costoTotal" = "costoManoObra"
WHERE "costoManoObra" > 0 AND "costoTotal" = 0;
