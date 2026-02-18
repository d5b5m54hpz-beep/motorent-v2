# MotoRent v2 — Architecture Guide

## Overview

MotoRent v2 is an event-driven monolith built on Next.js 15 App Router. Every business operation flows through a centralized EventBus that triggers automatic side effects: accounting entries, invoice generation, notifications, anomaly detection, and metrics aggregation.

## System Architecture

### Request Flow

```
Client Request
     │
     ▼
┌─────────────┐
│  Middleware  │ ← Route protection (session + role check)
└──────┬──────┘
       ▼
┌─────────────────────┐
│  requirePermission() │ ← Granular operation-level check
└──────┬──────────────┘
       ▼
┌─────────────┐
│ Business    │ ← Zod validation → Prisma DB operation
│ Logic       │
└──────┬──────┘
       ▼
┌─────────────┐
│ eventBus    │ ← Persist BusinessEvent to DB
│  .emit()    │
└──────┬──────┘
       │ (async, fault-tolerant)
       ▼
┌──────────────────────────────────────────────────────┐
│              Handler Pipeline (by priority)           │
│                                                       │
│  P30-40: Invoicing    (auto-create Factura)           │
│  P50:    Accounting   (auto double-entry bookkeeping) │
│  P200:   Notifications (alerts, emails)               │
│  P500:   Anomalies    (real-time fraud detection)     │
│  P999:   Metrics      (EventMetric aggregation)       │
└──────────────────────────────────────────────────────┘
```

## EventBus — Technical Design

### Singleton Pattern

The EventBus is a global singleton (`src/lib/events/event-bus.ts`) initialized once per Node.js process. Handlers are lazily registered on first use via `ensureHandlersRegistered()`, which calls `initializeEventHandlers()` from `src/lib/events/handlers/index.ts`.

### Event Lifecycle

1. **Persist**: Event is written to `BusinessEvent` table with status `PENDING`
2. **Match**: Handlers matching the operationId pattern are collected and sorted by priority
3. **Execute**: Handlers run asynchronously (for `emit()`) or synchronously (for `emitSync()`)
4. **Complete**: Event status updated to `COMPLETED` or `FAILED` with error details

### Pattern Matching

Handlers register with glob-like patterns:

```
"payment.approve"           → exact match
"payment.*"                 → matches payment.approve, payment.refund, etc.
"accounting.entry.*"        → matches accounting.entry.create, etc.
"*"                         → matches everything (used by Metrics handler)
```

Implementation in `matchPattern()`:
```
pattern === "*"             → true
pattern === code            → true (exact)
pattern.endsWith(".*")      → code.startsWith(prefix + ".")
```

### Error Handling

- Each handler runs in its own try/catch — one handler failure doesn't block others
- `emit()` is fire-and-forget: endpoint responds immediately, handlers run in background
- `emitSync()` waits for all handlers via `Promise.allSettled()` (used when handler results matter)
- Failed handlers are logged with `[EventBus]` prefix but don't throw to the caller
- If `retryOnFail: true` is set in handler options, the handler is retried once on failure

### Event Data Model

```prisma
model BusinessEvent {
  id            String   @id @default(cuid())
  operationId   String   // "fleet.moto.create"
  entityType    String   // "Moto"
  entityId      String   // cuid of the entity
  payload       Json     // { marca, patente, ... }
  status        String   // PENDING → COMPLETED | FAILED
  error         String?  // Error message if failed
  userId        String?  // User who triggered
  parentEventId String?  // For event chains (invoice→accounting)
  metadata      Json?
  createdAt     DateTime
  updatedAt     DateTime
}
```

## Permission System — Technical Design

### Data Model

```
User ──→ UserProfile ──→ PermissionProfile ──→ PermissionGrant ──→ Operation
  │         (junction)       (role group)         (per-operation)     (code)
  │
  └──→ role (legacy enum: ADMIN, OPERADOR, CLIENTE, CONTADOR, etc.)
```

### Permission Resolution Algorithm

`hasPermission(userId, operationCode, permissionType)`:

1. Fetch all `UserProfile` → `PermissionProfile` → `PermissionGrant` → `Operation` for the user
2. For each grant, check if `grant.operation.code` matches `operationCode` via `matchPattern()`
3. Check if the corresponding permission field (`canView`, `canCreate`, `canExecute`, `canApprove`) is true
4. Return true if ANY profile grants the permission (OR aggregation)

`requirePermission(operationCode, permissionType, fallbackRoles?)`:

1. Get session via `auth()` (NextAuth v5)
2. Return 401 if no session
3. If user role is `ADMIN` → always allowed (backwards compatibility)
4. Check granular permission via `hasPermission()`
5. If denied and `fallbackRoles` provided → check if user role is in the list
6. Return 403 if all checks fail

### Wildcard Grants

A profile can have grants for wildcard operations (e.g., Operation with code `fleet.*`). When `hasPermission()` runs, `matchPattern("fleet.*", "fleet.moto.create")` returns true, effectively granting access to all fleet operations.

### Seed & Migration

Profiles are seeded via `prisma/seed-permissions.ts`. Each profile has an array of grant patterns:

```typescript
{ pattern: "fleet.*", canView: true, canCreate: true, canExecute: true, canApprove: false }
```

The seed script:
1. Upserts all Operation records from the catalog
2. Creates/updates PermissionProfile records
3. Matches wildcard patterns against operations to create individual PermissionGrant records

## Automatic Accounting

### Design Principles

- Every financial event triggers a balanced double-entry AsientoContable
- Account codes follow Argentine Plan de Cuentas structure (1.x = Activo, 2.x = Pasivo, 4.x = Ingreso, 5.x = Egreso)
- `getOrCreateAccount()` ensures accounts exist before creating entries
- Each line item (LineaAsiento) has either `debe` or `haber` amount, never both
- Total DEBE must equal total HABER — this is validated on entry creation

### Account Plan

| Code | Account | Type |
|------|---------|------|
| 1.1.01 | Caja | ACTIVO |
| 1.1.02 | Banco | ACTIVO |
| 1.1.03 | Cuentas por Cobrar | ACTIVO |
| 1.1.04 | IVA Credito Fiscal | ACTIVO |
| 1.1.05 | Inventario / Repuestos | ACTIVO |
| 1.1.06 | Mercaderia en Transito | ACTIVO |
| 2.1.01 | Proveedores | PASIVO |
| 2.1.02 | IVA Debito Fiscal | PASIVO |
| 2.1.03 | Proveedores del Exterior | PASIVO |
| 2.1.04 | Remuneraciones a Pagar | PASIVO |
| 2.1.05 | Retenciones a Depositar | PASIVO |
| 2.1.06 | Contribuciones a Depositar | PASIVO |
| 4.1.01 | Ingresos por Alquiler | INGRESO |
| 5.1.01 | Gastos de Mantenimiento | EGRESO |
| 5.1.02 | Gastos de Repuestos | EGRESO |
| 5.3.01 | Sueldos y Jornales | EGRESO |
| 5.3.02 | Cargas Sociales Empleador | EGRESO |
| 5.7.02 | Diferencia de Inventario | EGRESO |
| 5.7.03 | Diferencias de Conciliacion | EGRESO |

## Bank Reconciliation

### 3-Step Matching Algorithm

When processing a reconciliation (`POST /api/conciliacion/procesar`):

**Step 1 — Exact Match (100% confidence)**
- Bank statement amount matches a Pago or Gasto amount exactly
- Date within ±1 day
- Automatically matched

**Step 2 — Approximate Match (60-90% confidence)**
- Amount within ±5% tolerance
- Date within ±7 days
- Confidence scored based on proximity
- Requires manual approval

**Step 3 — Reference Match (95% confidence)**
- Bank description contains a payment `referencia` string
- High confidence but still flagged for review

### Workflow

```
Import CSV/JSON → Parse & deduplicate (SHA-256 hash) → Store ExtractoBancario records
         ↓
Process matching → Create ConciliacionMatch records with confidence scores
         ↓
Review pending → Approve/reject approximate matches manually
         ↓
Complete → Mark Conciliacion as COMPLETADA → Trigger accounting entry (if adjustment needed)
```

## Anomaly Detection

### 9 Detection Algorithms

| # | Detector | Trigger | Severity | Threshold |
|---|----------|---------|----------|-----------|
| 1 | Gastos Inusuales | Expense 3x+ category average | ALTA/MEDIA | 3x=ALTA, 2x=MEDIA |
| 2 | Pagos Duplicados | Same amount + contract within 48h | ALTA | Exact amount match |
| 3 | Facturas Sin Pago | Invoices >30 days unpaid | CRITICA/ALTA/MEDIA | >90d=CRITICA, >60d=ALTA |
| 4 | Margen Bajo | Moto margin <10% or negative | CRITICA/MEDIA | <0%=CRITICA, <10%=MEDIA |
| 5 | Stock Critico | Parts below minimum stock | CRITICA/ALTA | 0=CRITICA, <min=ALTA |
| 6 | Desvio Presupuesto | Budget deviation >20% | ALTA/MEDIA | >50%=ALTA, >20%=MEDIA |
| 7 | Flujo Caja Negativo | 30-day cash projection <0 | CRITICA | Projected negative |
| 8 | Vencimientos Proximos | Insurance/VTV expiring within 15d | CRITICA/ALTA/MEDIA | Expired=CRITICA, <7d=ALTA |
| 9 | Patrones Sospechosos | Payments at 22:00-06:00, >2 refunds/client in 30d | ALTA/MEDIA | Unusual hours=MEDIA, refunds=ALTA |

### Detection Modes

- **Real-time** (via event handlers at priority 500): Detectors 1, 2, 5, 9 trigger immediately on relevant events
- **Batch** (via scheduled analysis): All 9 detectors run via `POST /api/anomalias/analisis/ejecutar`
- **Idempotency**: `anomaliaExiste()` checks for existing NUEVA/EN_REVISION anomalies with same (tipo, entidadId) to prevent duplicates

### Anomaly Lifecycle

```
Detection → NUEVA → "Tomar en revision" → EN_REVISION → "Resolver" → RESUELTA
                  └→ "Descartar" → DESCARTADA          └→ "Descartar" → DESCARTADA
```

## Real-Time Monitoring

### EventMetric Aggregation

The Metrics handler (priority 999) records every event into the `EventMetric` table:
- **Hourly granularity** (periodo: "2026-02-18T14"): Upserts counts for the current hour
- **Daily granularity** (periodo: "2026-02-18"): Upserts counts for the current day
- Fields: `totalEventos`, `exitosos`, `fallidos`, `tiempoPromedioMs`
- Unique key: `(periodo, granularidad, operationId)` for atomic upserts

### SystemHealth Checks

`POST /api/monitor/salud` performs live checks:
- DB latency via `SELECT 1`
- Handler count from EventBus
- Error rate from recent BusinessEvents
- Memory usage via `process.memoryUsage()`
- Status logic: HEALTHY (error rate <5%), DEGRADED (<20%), DOWN (≥20%)

## Scalability Roadmap

### Current: Event-Driven Monolith
The current architecture handles the business scale well. All handlers run in-process with async event emission. The EventBus provides decoupling between business logic and side effects.

### Near-term: Background Job Queue
Move long-running handlers (anomaly detection batch, financial analysis) to BullMQ + Redis. Keep the EventBus for real-time handlers, but offload heavy computation.

### Long-term: Microservices
Split by domain boundary (Fleet, Payments, Accounting, Inventory). Replace in-process EventBus with a message broker (RabbitMQ or Kafka). Each service owns its database schema.
