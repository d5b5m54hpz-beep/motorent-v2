# Deploy a Vercel - MotoRent v2

## Pre-requisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Base de datos PostgreSQL en [Neon](https://neon.tech)
3. Proyecto vinculado a GitHub/GitLab

## Variables de Entorno Requeridas

Configurar en Vercel → Settings → Environment Variables:

### Database
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require
```

### Auth
```
NEXTAUTH_SECRET=generate-random-secret-here
NEXTAUTH_URL=https://tu-dominio.vercel.app
ADMIN_EMAILS=admin@example.com
```

### OAuth (Google)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Payments (MercadoPago)
```
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-123456-abcdef1234567890abcdef1234567890-123456789
MERCADOPAGO_PUBLIC_KEY=TEST-abcd1234-5678-90ef-ghij-klmnopqrstuv
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

### Email (Resend)
```
RESEND_API_KEY=re_123456789_abcdefghijklmnopqrstuvwxyz
EMAIL_FROM=onboarding@resend.dev
```

### Opcionales
```
AFIP_CUIT=
AFIP_CERT=
AFIP_KEY=
VERIFIK_ENABLED=false
VERIFIK_API_KEY=
VERIFIK_SECRET=
GROK_API_KEY=
```

## Pasos para Deploy

### 1. Preparar Base de Datos (Solo primera vez)

Desde tu terminal local:

```bash
# Push schema a la base de datos
npx prisma db push

# Seed inicial (usuarios admin, pricing, motos de ejemplo)
npm run db:seed
```

### 2. Configurar Vercel

1. Importar proyecto desde GitHub
2. Framework Preset: **Next.js**
3. Build Command: `next build` (default)
4. Output Directory: `.next` (default)
5. Install Command: `npm install` (default)

### 3. Configurar Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:
- Agregar todas las variables listadas arriba
- Marcar las que empiezan con `NEXT_PUBLIC_` como visibles para el cliente

### 4. Deploy

```bash
# Desde tu terminal (opcional, también puedes hacerlo desde Vercel UI)
vercel --prod
```

O hacer push a la rama `main` en GitHub para auto-deploy.

## Post-Deploy

### Verificar Funcionalidades

1. **Auth**: Login con Google funciona correctamente
2. **Dashboard**: KPIs cargan sin errores
3. **CRUD Modules**: Motos, Clientes, Contratos, Pagos, Facturas funcionan
4. **Pricing**: Configuración de precios editable
5. **Alertas**: Se generan correctamente
6. **MercadoPago**: Checkout funciona (modo TEST)
7. **Email**: Envío de facturas funciona

### Configurar Cron Job (Opcional)

En `vercel.json` ya está configurado un cron job diario. Para activarlo:

1. Vercel Dashboard → Settings → Cron Jobs
2. Verificar que `/api/jobs/vencimientos` esté activo

## Troubleshooting

### Error: "Dynamic server usage"
- Normal durante el build, las páginas funcionarán correctamente en runtime

### Error: "Can't reach database"
- Verificar que `DATABASE_URL` esté correctamente configurada
- Verificar que Neon no esté en modo "suspend" (auto-activa con tráfico)

### Error: "NEXTAUTH_SECRET missing"
- Generar con: `openssl rand -base64 32`
- Agregar a variables de entorno en Vercel

### Build falla en "prisma generate"
- Verificar que `postinstall` script esté en package.json
- Si persiste, agregar `SKIP_ENV_VALIDATION=true` temporalmente

## Dominio Personalizado

1. Vercel Dashboard → Settings → Domains
2. Agregar dominio personalizado
3. Actualizar `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` con el nuevo dominio
4. Redeploy

## Producción

Para pasar a producción:

1. Cambiar credenciales de MercadoPago a modo PRODUCCIÓN
2. Configurar dominio verificado en Resend para emails
3. Activar AFIP (facturación electrónica)
4. Configurar Verifik KYC si es necesario
5. Revisar y ajustar ADMIN_EMAILS

## Monitoreo

- Vercel Analytics: automático
- Logs: Vercel Dashboard → Deployments → Function Logs
- Errores: Vercel Dashboard → Deployments → Build Logs
