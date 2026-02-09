# ✅ Checklist Pre-Deploy Vercel

## Build & Configuración

- [x] `npm run build` compila sin errores
- [x] Script `postinstall: "prisma generate"` agregado a package.json
- [x] next.config.ts configurado correctamente (sin output standalone)
- [x] Variables de entorno documentadas en .env.example
- [x] .vercelignore creado
- [x] DEPLOY.md con instrucciones completas

## TypeScript & Next.js 15

- [x] Todas las rutas API usan `await context.params` (Next.js 15)
- [x] No hay errores de TypeScript en el build
- [x] Validación de null/undefined en campos opcionales

## Módulos Implementados

- [x] **Auth**: NextAuth con Google OAuth + Credentials
- [x] **Dashboard**: KPI cards + estadísticas
- [x] **Motos**: CRUD completo + importación/exportación
- [x] **Clientes**: CRUD completo + aprobación + importación/exportación
- [x] **Contratos**: CRUD completo + preview de precios + generación de pagos
- [x] **Pagos**: CRUD completo + MercadoPago checkout + exportación
- [x] **Facturas**: CRUD completo + PDF + envío por email (Resend)
- [x] **Usuarios**: CRUD completo + gestión de roles + reset password
- [x] **Pricing**: Configuración de precios con preview en tiempo real
- [x] **Alertas**: Sistema de notificaciones con auto-generación

## APIs Públicas (Portal Cliente)

- [x] `/api/public/motos` - Listado de motos disponibles
- [x] `/api/public/motos/[id]` - Detalle de moto
- [x] `/api/public/motos/featured` - Motos destacadas
- [x] `/api/public/pricing` - Configuración de precios

## Portal Cliente (Rutas Públicas)

- [x] `/` - Landing page
- [x] `/catalogo` - Catálogo de motos
- [x] `/catalogo/[id]` - Detalle de moto con calculadora
- [x] `/alquiler/[motoId]` - Flujo de alquiler (4 pasos)
- [x] `/mi-cuenta` - Área de cliente (contratos, pagos, perfil)

## Integraciones

- [x] **MercadoPago**: Checkout + Webhooks
- [x] **Resend**: Envío de emails con facturas PDF
- [ ] **AFIP**: Facturación electrónica (pendiente credenciales)
- [ ] **Verifik**: KYC verificación (opcional, deshabilitado por default)

## Seguridad

- [x] Middleware de autenticación en rutas protegidas
- [x] Role-based access control (ADMIN, OPERADOR, CLIENTE)
- [x] Validación con Zod en todas las APIs
- [x] Hashing de passwords con bcrypt
- [x] Prevención de auto-modificación de roles
- [x] Prevención de auto-eliminación de cuenta

## Performance

- [x] Paginación en todas las listas
- [x] Búsqueda con debounce (300ms)
- [x] Lazy loading de componentes pesados
- [x] Optimización de imágenes con Next.js Image
- [x] Server Components donde es posible

## UI/UX

- [x] Design system con Shadcn/ui
- [x] Dark mode funcional
- [x] Responsive (mobile, tablet, desktop)
- [x] Loading states (skeletons)
- [x] Error handling con toast notifications
- [x] Empty states con mensajes claros

## Base de Datos

- [x] Schema de Prisma completo
- [x] Relaciones correctamente definidas
- [x] Índices en campos de búsqueda
- [x] Seed script con datos iniciales

## Testing Manual Recomendado Post-Deploy

1. **Auth**
   - [ ] Login con Google funciona
   - [ ] Login con email/password funciona (admin)
   - [ ] Roles se asignan correctamente

2. **Dashboard**
   - [ ] KPIs muestran datos correctos
   - [ ] Charts cargan sin errores

3. **CRUD Modules**
   - [ ] Crear, editar, eliminar funciona en cada módulo
   - [ ] Paginación y búsqueda funcionan
   - [ ] Exportación a Excel funciona
   - [ ] Importación desde Excel funciona

4. **Flujo de Alquiler**
   - [ ] Cliente puede ver catálogo sin login
   - [ ] Calculadora de precios muestra descuentos correctos
   - [ ] Flujo de 4 pasos completa sin errores
   - [ ] Contrato se crea con pagos generados

5. **Pagos**
   - [ ] Checkout MercadoPago abre correctamente
   - [ ] Webhook actualiza estado del pago
   - [ ] Cliente ve estado actualizado en Mi Cuenta

6. **Facturas**
   - [ ] PDF se genera correctamente
   - [ ] Email se envía con PDF adjunto
   - [ ] Factura se marca como "emailEnviado"

7. **Alertas**
   - [ ] Generar alertas detecta pagos vencidos
   - [ ] Generar alertas detecta contratos por vencer
   - [ ] Badge en sidebar/header muestra count correcto
   - [ ] Marcar como leída funciona

8. **Pricing**
   - [ ] Preview actualiza en tiempo real
   - [ ] Guardado actualiza contratos futuros
   - [ ] Tabla muestra precio diario correctamente

## Notas para Producción

- Cambiar MercadoPago a credenciales PRODUCCIÓN
- Configurar dominio verificado en Resend
- Activar AFIP si es necesario
- Revisar ADMIN_EMAILS para producción
- Configurar dominio personalizado en Vercel
- Activar Analytics de Vercel
- Configurar alertas de errores (Sentry, etc.)

## Comandos Útiles

```bash
# Verificar build local
npm run build

# Push schema a producción
npx prisma db push

# Seed inicial (solo primera vez)
npm run db:seed

# Ver logs de Prisma
npx prisma studio
```
