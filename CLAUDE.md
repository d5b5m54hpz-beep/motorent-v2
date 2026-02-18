# CLAUDE.md — MotoRent v2 System Guide

## 1. System Overview

**MotoRent v2** is an event-driven ERP for motorcycle rental management and e-commerce, operating in Buenos Aires, Argentina. The system handles the complete business lifecycle: fleet management, rental contracts, payments, invoicing (AFIP-compliant), double-entry accounting, inventory/parts with import logistics, HR/payroll, bank reconciliation, anomaly detection, and real-time monitoring.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Prisma 6, PostgreSQL (Neon), NextAuth v5, Tailwind CSS 3 + Shadcn/ui, Recharts, Sonner, Zod.

**Deploy:** Railway (auto-deploy from main) with custom `server.js` binding to `0.0.0.0`.

**Scale:** 85 Prisma models, 130+ operations, 209 API routes, 8 permission profiles.

## 2. Event-Driven Architecture

Every write operation follows this flow:

```
Request → Auth (requirePermission) → Business Logic → DB Write
                                                        ↓
                                                  eventBus.emit()
                                                        ↓
                                    ┌──────────┬────────────┬──────────────┐
                                    ↓          ↓            ↓              ↓
                               Invoicing   Accounting   Notifications   Anomaly Detection
                               (P30-40)     (P50)        (P200)          (P500)
                                                                           ↓
                                                                        Metrics
                                                                        (P999)
```

- **EventBus** (`src/lib/events/event-bus.ts`): Singleton with `emit()` (fire-and-forget) and `emitSync()` (waits for handlers). Pattern matching with wildcards (`payment.*`, `fleet.*`, `*`).
- **BusinessEvent**: Every event is persisted to DB with operationId, entityType, entityId, payload, status, userId.
- **Handlers**: Registered by pattern, executed by priority (lower = first). Each handler gets an `EventContext` with the full event data.
- **Handler Priorities**: Invoicing (30-40) → Accounting (50) → Notifications (200) → Anomalies (500) → Metrics (999).

## 3. Permission System

```
User → UserProfile → PermissionProfile → PermissionGrant → Operation
```

- **Operations**: Defined in `src/lib/events/operations.ts` as `OPERATIONS` constant. Naming: `domain.entity.action` (e.g., `fleet.moto.create`).
- **Permission Types**: `canView`, `canCreate`, `canExecute`, `canApprove`.
- **Wildcard Matching**: `"fleet.*"` matches `"fleet.moto.create"`, `"*"` matches everything.
- **requirePermission()**: From `src/lib/auth/require-permission.ts`. Returns `{ error, userId }`. ADMIN role always bypasses.
- **Fallback Roles**: `requirePermission(op, type, ["OPERADOR"])` — legacy role check if no granular permission found.
- **8 System Profiles**: Administrador (full), Operador Flota, Contador, RRHH, Comercial, Mecanico, Cliente, Auditor (read-only).

## 4. How to Add a New Operation

**Example: Adding `warranty.claim.create`**

### Step 1: Define operation ID
```typescript
// src/lib/events/operations.ts
export const OPERATIONS = {
  // ... existing
  warranty: {
    claim: {
      create: "warranty.claim.create",
      view: "warranty.claim.view",
    },
  },
} as const;
```

### Step 2: Create endpoint with requirePermission + event emission
```typescript
// src/app/api/garantias/route.ts
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.warranty.claim.create, "create", ["OPERADOR"]
  );
  if (error) return error;

  const claim = await withEvent(
    {
      operationId: OPERATIONS.warranty.claim.create,
      entityType: "WarrantyClaim",
      getEntityId: (c) => c.id,
      getPayload: (c) => ({ motoId: c.motoId, monto: c.monto }),
      userId,
    },
    () => prisma.warrantyClaim.create({ data: parsed.data })
  );

  return NextResponse.json(claim, { status: 201 });
}
```

### Step 3: Add accounting handler (if needed)
```typescript
// src/lib/events/handlers/accounting.ts
async function handleWarrantyClaimAccounting(ctx: EventContext) {
  // Create AsientoContable with balanced Debe/Haber
}
eventBus.registerHandler("warranty.claim.create", handleWarrantyClaimAccounting, { priority: 50 });
```

### Step 4: Add notification handler (if needed)
```typescript
// src/lib/events/handlers/notifications.ts
eventBus.registerHandler("warranty.claim.create", handleWarrantyNotification, { priority: 200 });
```

### Step 5: Seed permissions
```typescript
// prisma/seed-permissions.ts — add to operationCatalog array
{ operationCode: "warranty.claim.create", family: "warranty", entity: "claim", action: "create",
  description: "Create warranty claim", requiresApproval: false, isViewOnly: false },
// Add to relevant profile grants
```

### Step 6: Add anomaly detector (if needed)
```typescript
// src/lib/services/anomaly-detector.ts — add detection function
// src/lib/events/handlers/anomaly-detection.ts — register handler at priority 500
```

## 5. Critical Rules — ALWAYS FOLLOW

### Styling
- **ONLY** Tailwind CSS utility classes + Shadcn/ui components
- **NEVER** inline styles (`style={{}}`) or custom CSS classes
- Use `cn()` from `@/lib/utils` for conditional classes
- Add Shadcn components: `npx shadcn@latest add <component>`

### API Routes
- Validate with Zod (`src/lib/validations.ts`)
- Protect with `requirePermission(OPERATIONS.x.y.z, permType, fallbackRoles)`
- Paginate list endpoints (`page`, `limit` query params)
- Return `NextResponse.json()`
- Use `catch (error: unknown)` — never `catch (error: any)`
- Emit events for all write operations (see Section 4)
- Operation IDs from `OPERATIONS` constant — never string literals

### Event Emission
- **Pattern 1 — `withEvent()`**: For simple create/update operations
- **Pattern 2 — `eventBus.emit()`**: For conditional events (state transitions)
- `emit()` uses positional args: `emit(operationId, entityType, entityId, payload, userId)`
- Always `.catch()` on emit to prevent failures from breaking responses
- Events emitted AFTER operation succeeds, never on failure

### Database
- Prisma client from `@/lib/prisma`
- Never use raw SQL
- Money fields: always `Decimal` (never Float)
- After schema changes: `npx prisma generate && npx prisma db push`

### Components
- Server Components by default; `"use client"` only when needed
- ONE component per file
- Import with `@/` alias
- DataTable from `@/components/data-table/data-table.tsx` for all data tables

### Auth
- NextAuth v5 config: `src/lib/auth.ts`
- Granular permissions (preferred): `requirePermission()` from `@/lib/auth/require-permission.ts`
- Legacy roles (fallback): `requireRole()` from `@/lib/authz.ts`
- Middleware protects routes in `src/middleware.ts`

### Conventions
- Business entities in Spanish: motos, contratos, pagos, facturas, mantenimientos, proveedores, repuestos
- Code/variables/functions in English
- Operation naming: `domain.entity.action` (lowercase, dots)
- Handlers always wrapped in individual try/catch
- Argentine formatting: `formatMoney()` from `@/lib/format` for currency, `es-AR` locale for dates

## 6. Key Directory Structure

```
src/lib/events/
  event-bus.ts              — EventBus singleton (emit, emitSync, registerHandler)
  operations.ts             — 130+ operation IDs (OPERATIONS constant)
  with-event.ts             — withEvent() wrapper for endpoints
  handlers/
    index.ts                — initializeEventHandlers() — registers all handlers
    accounting.ts           — 16 accounting handlers (auto double-entry bookkeeping)
    invoicing.ts            — 2 auto-invoicing handlers (payment→factura)
    notifications.ts        — 12 notification/alert handlers
    anomaly-detection.ts    — 4 real-time anomaly detection handlers
    metrics.ts              — EventMetric aggregation (hourly/daily)

src/lib/auth/
  permissions.ts            — hasPermission(), getUserPermissions(), matchPattern()
  require-permission.ts     — requirePermission() middleware

src/lib/services/
  anomaly-detector.ts       — 9 detection algorithms
  financial-analysis.ts     — Daily/weekly/monthly analysis runner

src/components/
  anomalias/                — Anomaly UI components (SeveridadBadge, EstadoBadge, etc.)
  permisos/                 — Permission UI components (OperationTree, ProfileCard, etc.)
  charts/                   — Reusable chart components with MotoLibre theme
  data-table/               — Reusable DataTable component
  layout/                   — Sidebar, header, nav sections
```

## 7. Data Models by Domain

| Domain | Models | Key Model |
|--------|--------|-----------|
| **Auth & Users** | User, Role enum | User (OAuth + credentials, roles, 2FA) |
| **Fleet** | Moto, DocumentoMoto, BajaMoto, Amortizacion, LecturaKm | Moto (registration, insurance, financials) |
| **Rental** | Cliente, Contrato, PricingConfig | Contrato (frequency, purchase option) |
| **Payments** | Pago | Pago (MercadoPago integration) |
| **Invoicing** | Factura, FacturaCompra, NotaCredito | Factura (AFIP CAE, Type A/B/C) |
| **Accounting** | CuentaContable, AsientoContable, LineaAsiento, PeriodoContable, Gasto, PresupuestoMensual | AsientoContable (double-entry) |
| **Maintenance** | PlanMantenimiento, OrdenTrabajo, CitaMantenimiento, Taller, Mecanico (15 models total) | OrdenTrabajo (full lifecycle) |
| **Inventory** | Repuesto, MovimientoStock, OrdenCompra, RecepcionMercaderia, UbicacionDeposito | Repuesto (cost tracking, supplier) |
| **Imports** | EmbarqueImportacion, ItemEmbarque, DespachoAduanero (11 models total) | EmbarqueImportacion (FOB, duties, logistics) |
| **Pricing** | ListaPrecio, ReglaMarkup, ReglaDescuento, GrupoCliente (11 models total) | ListaPrecio (RETAIL, MAYORISTA, etc.) |
| **HR** | Empleado, ReciboSueldo, Ausencia | Empleado (salary, labor, ART) |
| **Reconciliation** | CuentaBancaria, ExtractoBancario, Conciliacion, ConciliacionMatch | Conciliacion (3-step matching) |
| **Anomalies** | Anomalia, AnalisisFinanciero | Anomalia (10 types, 4 severities) |
| **Permissions** | Operation, PermissionProfile, PermissionGrant, UserProfile | Operation (130+ operation codes) |
| **System** | BusinessEvent, EventMetric, SystemHealth, DiagnosticoRun, AuditLog, ConfiguracionEmpresa | BusinessEvent (event persistence) |

## 8. Accounting Handler Map

When these events fire, automatic double-entry accounting entries are created:

| Event | Entry Type | Debit | Credit |
|-------|-----------|-------|--------|
| `payment.approve` | COBRO | Caja (1.1.01) | Ingresos Alquiler (4.1.01) |
| `payment.refund` | AJUSTE | Ingresos Alquiler | Caja |
| `invoice.sale.create` | VENTA | Cuentas por Cobrar (1.1.03) | Ingresos + IVA Débito |
| `invoice.sale.cancel` | AJUSTE | Ingresos + IVA | Cuentas por Cobrar |
| `invoice.purchase.create` | COMPRA | Gastos + IVA Crédito | Proveedores (2.1.01) |
| `expense.create` | COMPRA | Gasto por categoría | Caja |
| `inventory.part.adjust_stock` | AJUSTE | Inventario (1.1.05) | Diferencia Inventario (5.7.02) |
| `inventory.reception.create` | COMPRA | Inventario | Proveedores |
| `import_shipment.confirm_costs` | COMPRA | Mercadería en Tránsito (1.1.06) | Proveedores Exterior (2.1.03) |
| `import_shipment.dispatch.create` | COMPRA | Mercadería en Tránsito + IVA | Caja |
| `import_shipment.reception.finalize` | AJUSTE | Inventario | Mercadería en Tránsito |
| `maintenance.workorder.complete` | COMPRA | Mantenimiento (5.1.01) | Caja |
| `credit_note.create` | AJUSTE | Ventas + IVA | Cuentas por Cobrar |
| `hr.payroll.liquidate` | COMPRA | Sueldos + Cargas Sociales | Remuneraciones + Retenciones |
| `reconciliation.process.complete` | AJUSTE | Banco (1.1.02) | Diferencia Conciliación (5.7.03) |

## 9. Common Commands

```bash
npm run dev              # Start dev server (port 3000)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB
npm run db:seed          # Seed initial data + permissions
npm run db:studio        # Open Prisma Studio
npx shadcn@latest add X  # Add Shadcn component
npx tsc --noEmit         # Type check (zero errors expected)
```

## 10. Detailed Documentation

See `docs/` for deep dives:
- `docs/ARCHITECTURE.md` — Technical architecture, EventBus design, permission algorithm, reconciliation, anomaly detection
- `docs/OPERATIONS_CATALOG.md` — Complete catalog of all 130+ operations with handlers and side effects
- `docs/PERMISSION_PROFILES.md` — Detailed breakdown of all 8 permission profiles
