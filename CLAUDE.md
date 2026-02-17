# CLAUDE.md — MotoRent v2 Project Instructions

## Project Overview
ERP/SaaS for motorcycle rental management (Buenos Aires, Argentina). Migrated from v1 to professional architecture.

## Tech Stack
- Next.js 15, React 19, TypeScript strict
- Tailwind CSS 3 + Shadcn/ui (ONLY — no inline styles, no custom CSS)
- PostgreSQL (Neon) + Prisma ORM
- NextAuth v5 (Google OAuth + credentials)
- Zod validation on all API routes
- TanStack Table for data tables
- Recharts for charts
- Sonner for toast notifications
- Vercel Cron for scheduled jobs

## Critical Rules — ALWAYS FOLLOW

### Styling
- ONLY use Tailwind CSS utility classes and Shadcn/ui components
- NEVER use inline styles (style={{}})
- NEVER create custom CSS classes — use Tailwind
- When you need a component (button, dialog, form, etc.), check if Shadcn/ui has it: `npx shadcn@latest add <component>`
- Use `cn()` from `@/lib/utils` for conditional classes

### API Routes
- ALWAYS validate request body with Zod (schemas in `src/lib/validations.ts`)
- ALWAYS protect with `requirePermission()` from `@/lib/auth/require-permission.ts` (preferred) or `requireRole()` from `@/lib/authz.ts` as legacy fallback
- When migrating from `requireRole` → `requirePermission`, pass `fallbackRoles` to keep legacy roles working: `requirePermission("fleet.moto.create", "create", ["OPERADOR"])`
- ALWAYS paginate list endpoints (accept `page` and `limit` query params)
- ALWAYS return `NextResponse.json()`
- NEVER use `catch (error: any)` — use `catch (error: unknown)` with proper type narrowing
- ALWAYS emit events for write operations using the Event Pattern (see below)

### Components
- Server Components by default
- Add `"use client"` ONLY when component uses hooks, event handlers, or browser APIs
- Use DataTable from `@/components/data-table/data-table.tsx` for ALL data tables
- ONE component per file
- Import with `@/` alias always

### Database
- Prisma client from `@/lib/prisma`
- Never use raw SQL
- Schema defined in `prisma/schema.prisma`
- After schema changes: `npx prisma generate && npx prisma db push`

### Auth & Permissions
- Auth config in `src/lib/auth.ts`
- **Granular permissions** (preferred): `requirePermission()` from `@/lib/auth/require-permission.ts`
- **Legacy roles** (fallback): `requireRole()` from `@/lib/authz.ts`
- Roles: ADMIN (full access), OPERADOR (CRUD operations), CLIENTE (client portal)
- Permission profiles: defined in `prisma/seed-permissions.ts` (8 system profiles)
- Operations registry: `src/lib/events/operations.ts` (51 operation IDs)
- Middleware in `src/middleware.ts` protects routes

### Forms
- Use react-hook-form + @hookform/resolvers/zod
- Reuse schemas from `src/lib/validations.ts`
- Wrap in Shadcn Form component when available

## File Structure Conventions
- Business routes/entities: Spanish (`motos`, `contratos`, `pagos`, `facturas`)
- Code (variables, functions, types): English
- One component per file
- API patterns:
  - `src/app/api/{entity}/route.ts` → GET (list) + POST (create)
  - `src/app/api/{entity}/[id]/route.ts` → GET (detail) + PUT (update) + DELETE

## CRUD Module Pattern
When creating a new CRUD module, follow this order:
1. Add Zod schema to `src/lib/validations.ts`
2. Create API routes (list/create + detail/update/delete)
3. Create admin page with DataTable at `src/app/(dashboard)/admin/{entity}/page.tsx`
4. Create columns definition in `columns.tsx` next to the page
5. Create form component with react-hook-form

## Existing Modules Status
- [x] Project setup (Next.js, Tailwind, Shadcn, Prisma, Auth, middleware)
- [x] Database schema (all models defined)
- [x] Admin layout (sidebar, header, theme toggle)
- [x] Dashboard page (KPI cards, chart placeholders)
- [x] DataTable component (reusable)
- [x] Motos API (GET paginated, POST with Zod)
- [x] Cron job example (vencimientos)
- [x] Seed data (admin user, pricing, sample motos)
- [ ] Motos admin page (DataTable + form)
- [ ] Contratos CRUD
- [ ] Pagos CRUD
- [ ] Facturas CRUD + PDF + AFIP
- [ ] Clientes CRUD
- [ ] Usuarios CRUD
- [ ] Alertas center
- [ ] Pricing config page
- [ ] Client portal (landing, catalog, checkout, profile)
- [ ] MercadoPago integration
- [ ] SendGrid email
- [ ] Verifik KYC
- [ ] Recharts dashboard charts
- [ ] Command palette (⌘K search)

## Key Files to Know
- `src/lib/auth.ts` — NextAuth config with Google + credentials
- `src/lib/authz.ts` — `requireRole()` legacy helper
- `src/lib/auth/require-permission.ts` — `requirePermission()` granular auth (preferred)
- `src/lib/auth/permissions.ts` — Permission service (hasPermission, getUserPermissions)
- `src/lib/events/operations.ts` — 51 operation IDs (`OPERATIONS` constant)
- `src/lib/events/event-bus.ts` — EventBus singleton (emit, emitSync)
- `src/lib/events/with-event.ts` — `withEvent()` wrapper for endpoint event emission
- `src/lib/events/handlers/` — Event handler modules
- `src/lib/validations.ts` — ALL Zod schemas
- `src/lib/prisma.ts` — DB client singleton
- `src/components/data-table/data-table.tsx` — Reusable table
- `src/components/layout/app-sidebar.tsx` — Admin sidebar navigation
- `src/middleware.ts` — Route protection
- `prisma/schema.prisma` — Database models
- `prisma/seed-permissions.ts` — Permission profiles & operations seed

## Event Pattern — Emitting Business Events from Endpoints

Every write operation (POST/PUT/DELETE) should emit a `BusinessEvent` through the `EventBus`. This enables automatic side-effects (accounting entries, notifications, metrics) without coupling endpoints to downstream logic.

### Key Files
- `src/lib/events/operations.ts` — Registry of all 51 operation IDs (`OPERATIONS` constant)
- `src/lib/events/event-bus.ts` — `eventBus` singleton with `emit()` (fire-and-forget) and `emitSync()` (waits for handlers)
- `src/lib/events/with-event.ts` — `withEvent()` wrapper helper
- `src/lib/events/handlers/` — Event handler modules (accounting, invoicing, notifications, metrics)

### Pattern 1: `withEvent()` wrapper — for simple create/update operations

Use when the entire operation is a single DB call. The wrapper executes the operation, then emits the event.

```typescript
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "create",
    ["OPERADOR"] // fallback roles during migration
  );
  if (error) return error;

  const moto = await withEvent(
    {
      operationId: OPERATIONS.fleet.moto.create,
      entityType: "Moto",
      getEntityId: (m) => m.id,
      getPayload: (m) => ({ marca: m.marca, patente: m.patente }),
      userId,
    },
    () => prisma.moto.create({ data: parsed.data })
  );

  return NextResponse.json(moto, { status: 201 });
}
```

### Pattern 2: Direct `eventBus.emit()` — for conditional events (state transitions)

Use when the event should only fire on specific state changes (e.g., payment approved, invoice approved).

```typescript
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

// After the transaction completes:
if (newEstado === "aprobado" && previousEstado !== "aprobado") {
  eventBus.emit(
    OPERATIONS.payment.approve,
    "Pago",
    id,
    { previousEstado, newEstado, monto, contratoId },
    userId
  ).catch((err) => {
    console.error("Error emitting payment.approve event:", err);
  });
}
```

### Migration Checklist (per endpoint)
1. Replace `requireRole()` with `requirePermission(OPERATION_ID, permType, fallbackRoles)`
2. Add `withEvent()` wrapper or direct `eventBus.emit()` call for write operations
3. Use operation IDs from `OPERATIONS` constant — never use string literals
4. Include relevant entity data in the payload (IDs, amounts, state changes)
5. For state transitions: capture `previousEstado` before the update, emit only on actual change

### Rules
- Operation IDs MUST come from `src/lib/events/operations.ts` (`OPERATIONS` constant)
- NEVER use string literals for operation IDs — always reference `OPERATIONS.domain.entity.action`
- Events are emitted AFTER the operation succeeds (never emit on failure)
- Use `emit()` (fire-and-forget) by default; use `emitSync()` only when handlers must complete before responding
- Payload should include enough context for handlers (entity IDs, amounts, state transitions)
- Catch emit errors to prevent event failures from breaking the endpoint response

## Common Commands
```bash
npm run dev              # Start dev server
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB
npm run db:seed          # Seed initial data
npm run db:studio        # Open Prisma Studio
npx shadcn@latest add X  # Add Shadcn component
```
