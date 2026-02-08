# MotoRent v2

Sistema de gestión de alquiler de motos. Migración profesional con arquitectura limpia.

## Stack

- **Framework:** Next.js 15 + React 19 + TypeScript
- **UI:** Tailwind CSS 3 + Shadcn/ui (100%)
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Auth:** NextAuth v5 (Google + credentials, roles ADMIN/OPERADOR/CLIENTE)
- **Validación:** Zod en todas las APIs
- **Tablas:** TanStack Table con sort/filter/paginación
- **Gráficos:** Recharts
- **Pagos:** MercadoPago
- **Facturación:** PDFKit + AFIP
- **Email:** SendGrid
- **KYC:** Verifik
- **Cron:** Vercel Cron (no node-cron)
- **Deploy:** Vercel

## Setup

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd motorent-v2
npm install

# 2. Configurar env
cp .env.example .env
# → Editar .env con credenciales de Neon, Google OAuth, etc.

# 3. Generar Prisma + push schema
npx prisma generate
npx prisma db push

# 4. Seed inicial
npm run db:seed

# 5. Dev server
npm run dev
```

## Estructura

```
src/
├── app/
│   ├── (auth)/           # Login, registro (layout sin sidebar)
│   │   ├── login/
│   │   ├── login-admin/
│   │   └── registro/
│   ├── (dashboard)/      # Panel admin (layout con sidebar)
│   │   ├── layout.tsx    # Sidebar + Header + Auth check
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard KPIs + gráficos
│   │       ├── motos/            # CRUD motos
│   │       ├── contratos/        # CRUD contratos
│   │       ├── pagos/            # Gestión pagos
│   │       ├── facturas/         # Facturas + AFIP
│   │       ├── clientes/         # Gestión clientes
│   │       ├── usuarios/         # Admin usuarios
│   │       ├── alertas/          # Centro de alertas
│   │       └── pricing/          # Config precios
│   ├── (client)/         # Portal cliente (layout público)
│   │   ├── motos/
│   │   ├── checkout/
│   │   └── perfil/
│   └── api/              # API routes (todas con Zod + auth)
│       ├── auth/
│       ├── motos/
│       ├── contratos/
│       ├── pagos/
│       ├── facturas/
│       ├── alertas/
│       ├── dashboard/
│       ├── pricing/
│       ├── usuarios/
│       ├── jobs/         # Vercel Cron endpoints
│       ├── mp/           # MercadoPago webhook
│       └── public/       # Endpoints sin auth
├── components/
│   ├── ui/               # Shadcn/ui components
│   ├── layout/           # Sidebar, Header, ThemeProvider
│   └── data-table/       # Tabla reutilizable
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── authz.ts          # Role-based auth helpers
│   ├── prisma.ts         # Prisma client singleton
│   ├── validations.ts    # Zod schemas
│   ├── email.ts          # SendGrid helper
│   └── utils.ts          # cn(), formatCurrency(), formatDate()
├── hooks/
├── types/
│   └── next-auth.d.ts    # Type extensions
└── middleware.ts          # Route protection
```

## Credenciales por defecto

- **Admin:** admin@motorent.com / admin123

## Para Claude Code

### Reglas generales

1. **SIEMPRE usar Shadcn/ui** — nunca inline styles, nunca className con estilos ad-hoc largos
2. **Validación con Zod** en TODAS las API routes (ya están los schemas en `src/lib/validations.ts`)
3. **Auth con `requireRole()`** en TODOS los endpoints protegidos (nunca comentar auth)
4. **Paginación server-side** en todos los endpoints que devuelven listas
5. **Error handling tipado** — nunca `catch (error: any)`, siempre `catch (error: unknown)`
6. **Componentes server** por defecto, `"use client"` solo cuando necesario
7. **DataTable** para todas las tablas de datos (usar el componente de `src/components/data-table/`)

### Agregar componentes Shadcn/ui

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
# etc.
```

### Patrón para crear un módulo CRUD

1. Crear API route en `src/app/api/{entity}/route.ts` con GET (paginado) + POST
2. Crear API route en `src/app/api/{entity}/[id]/route.ts` con GET + PUT + DELETE
3. Crear schema Zod en `src/lib/validations.ts`
4. Crear página en `src/app/(dashboard)/admin/{entity}/page.tsx` con DataTable
5. Crear columnas en archivo separado `columns.tsx`
6. Crear formulario con react-hook-form + Zod resolver

### Convenciones

- Archivos en español para rutas/entidades del negocio
- Código en inglés (variables, funciones, tipos)
- Imports con alias `@/` siempre
- Un componente por archivo
- API routes: siempre devolver `NextResponse.json()`
