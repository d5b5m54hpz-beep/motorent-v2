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
- ALWAYS protect with `requireRole()` from `@/lib/authz.ts` (NEVER comment out auth)
- ALWAYS paginate list endpoints (accept `page` and `limit` query params)
- ALWAYS return `NextResponse.json()`
- NEVER use `catch (error: any)` — use `catch (error: unknown)` with proper type narrowing

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

### Auth
- Auth config in `src/lib/auth.ts`
- Role check helper in `src/lib/authz.ts`: `requireRole(["ADMIN", "OPERADOR"])`
- Roles: ADMIN (full access), OPERADOR (CRUD operations), CLIENTE (client portal)
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
- `src/lib/authz.ts` — `requireRole()` helper
- `src/lib/validations.ts` — ALL Zod schemas
- `src/lib/prisma.ts` — DB client singleton
- `src/components/data-table/data-table.tsx` — Reusable table
- `src/components/layout/app-sidebar.tsx` — Admin sidebar navigation
- `src/middleware.ts` — Route protection
- `prisma/schema.prisma` — Database models
- `vercel.json` — Cron job schedule

## Common Commands
```bash
npm run dev              # Start dev server
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to DB
npm run db:seed          # Seed initial data
npm run db:studio        # Open Prisma Studio
npx shadcn@latest add X  # Add Shadcn component
```
