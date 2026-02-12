# PENDING: Gestión Profesional de Motos - Frontend

**Fecha**: 2026-02-12
**Status**: Backend completado ✅ | Frontend pendiente ⏳
**Última actualización**: Commit `aeb1ab1`

---

## ✅ COMPLETADO (Backend Ready)

### APIs Deployadas en Railway:
1. **POST /api/motos/bulk** - Acciones masivas
   - `PATCH`: Actualización masiva (estado, imagen, etc.)
   - `DELETE`: Eliminación masiva con validación de contratos
   - Maneja motos con contratos asociados
   - Elimina mantenimientos antes de borrar motos

2. **GET /api/motos/filters** - Filtros dinámicos
   - Retorna: marcas, modelos (por marca), colores, tipos, años (min/max)
   - Listo para poblar selects de filtros

3. **GET /api/motos/tipos** - Autocomplete tipos (público)
4. **GET /api/motos/marcas** - Autocomplete marcas (público)
5. **GET /api/motos/colores** - Autocomplete colores (público)

### Otros completados:
- ✅ Validaciones dinámicas (tipo/marca/color son strings, no enums)
- ✅ Importador acepta cualquier tipo/marca/color
- ✅ Branding "MotoLibre" ya correcto en toda la app
- ✅ Middleware permite acceso público a endpoints de autocomplete

---

## ⏳ PENDIENTE (Frontend Implementation)

### Archivo Principal a Modificar:
**`src/app/(dashboard)/admin/motos/page.tsx`** (401 líneas actuales)

### Backup Disponible:
- `page.tsx.backup` - Versión original guardada

---

## 📋 FEATURES A IMPLEMENTAR

### PARTE 1: Selección Múltiple + Acciones Masivas
**Prioridad**: 🔴 ALTA

**Componentes nuevos a crear**:
1. `bulk-actions-toolbar.tsx` - Toolbar sticky que aparece cuando hay selección
2. `bulk-state-dialog.tsx` - Dialog para cambiar estado masivo
3. `bulk-image-dialog.tsx` - Dialog para cambiar imagen masiva
4. `bulk-delete-confirm.tsx` - Confirmación de eliminación masiva

**Cambios en `page.tsx`**:
- Agregar `useState<Set<string>>` para IDs seleccionados
- Agregar columna de checkbox al principio de la tabla
- Checkbox "select all" en header
- Visual: fila seleccionada con `bg-cyan-500/5`
- Mostrar toolbar cuando `selected.size > 0`

**Toolbar debe incluir**:
```tsx
✓ {selected.size} motos seleccionadas
[Cambiar Estado ▼] [Cambiar Imagen] [Eliminar] [Exportar] [Deseleccionar]
```

**APIs a usar**:
- `PATCH /api/motos/bulk` con `{ ids: [...], updates: {...} }`
- `DELETE /api/motos/bulk` con `{ ids: [...] }`

---

### PARTE 2: Filtros Profesionales
**Prioridad**: 🟠 MEDIA

**Componente a crear**:
- `motos-filters.tsx` - Barra de filtros completa

**Filtros a implementar**:
- Estado: Multi-select (Disponible, Alquilada, Mantenimiento, Baja)
- Marca: Select dinámico (usar `/api/motos/filters`)
- Modelo: Select dinámico (filtrado por marca)
- Año: Range (min - max)
- Color: Select dinámico
- Tipo: Select dinámico
- Cilindrada: Range (min - max)
- Botón "Limpiar filtros"

**Badges de filtros activos**:
```tsx
Filtros activos: [Estado: Disponible ✕] [Marca: Honda ✕] [Limpiar todo]
```

**Lógica de filtrado** (client-side para <500 motos):
```typescript
const filteredMotos = motos.filter(moto => {
  if (filters.estado.length && !filters.estado.includes(moto.estado)) return false;
  if (filters.marca && moto.marca !== filters.marca) return false;
  if (filters.modelo && moto.modelo !== filters.modelo) return false;
  // ... resto de filtros
  return true;
});
```

---

### PARTE 3: Columnas Mejoradas
**Prioridad**: 🟠 MEDIA

**Actualizar `columns.tsx`**:

| # | Columna | Implementación |
|---|---------|----------------|
| 1 | ☐ | Checkbox selección |
| 2 | Imagen | `<Image src={moto.imagen \|\| '/placeholder.png'} width={40} height={40} />` |
| 3 | Marca | Texto normal |
| 4 | Modelo | Texto normal |
| 5 | Año | Número |
| 6 | Patente | `<Badge className="font-mono">{patente}</Badge>` |
| 7 | Cilindrada | `{cilindrada} cc` |
| 8 | Tipo | `<Badge variant="outline">{tipo}</Badge>` |
| 9 | Color | `<div className="flex items-center gap-2"><div className="h-4 w-4 rounded-full" style={{backgroundColor}} />{color}</div>` |
| 10 | Estado | Badge con colores (verde/azul/amarillo/rojo) |
| 11 | Km | `{km.toLocaleString('es-AR')}` |
| 12 | Acciones | DropdownMenu con 8 opciones |

**Menu de acciones (···)**:
- 👁 Ver detalle
- ✏️ Editar
- 📸 Cambiar imagen
- 🔧 Registrar mantenimiento
- 📋 Ver contratos
- 📊 Ver rentabilidad
- ⬇️ Cambiar estado → (submenu)
- 🗑 Eliminar

---

### PARTE 4: Exportación Avanzada
**Prioridad**: 🟡 BAJA

**Cambiar botón Export por dropdown**:
```tsx
[⬇ Exportar ▼]
├── 📊 Excel - Todas
├── 📊 Excel - Filtradas/Seleccionadas
├── 📄 CSV
└── 🖨 PDF
```

**Lógica**:
- Si `selected.size > 0`: exportar seleccionadas
- Si hay filtros activos: exportar filtradas
- Sino: exportar todas

---

### PARTE 5: Mejoras Visuales
**Prioridad**: 🔴 ALTA

#### Stats Cards (arriba de la tabla)
```tsx
<div className="grid grid-cols-5 gap-4 mb-6">
  <StatsCard label="Total" value={total} icon={<Bike />} />
  <StatsCard label="Disponibles" value={disponibles} color="green" onClick={() => filterBy('disponible')} />
  <StatsCard label="Alquiladas" value={alquiladas} color="blue" />
  <StatsCard label="Mantenimiento" value={mantenimiento} color="yellow" />
  <StatsCard label="Baja" value={baja} color="red" />
</div>
```

#### Toggle Vista (Tabla | Grilla)
```tsx
<ToggleGroup type="single" value={viewMode}>
  <ToggleGroupItem value="table">☰ Tabla</ToggleGroupItem>
  <ToggleGroupItem value="grid">⊞ Grilla</ToggleGroupItem>
</ToggleGroup>
```

**Vista Grilla**: Cards con imagen grande, badge de estado, detalles compactos

#### Paginación
- Ya existe en página actual
- Mantener: selector filas/página (10, 20, 50, 100)
- Mantener: navegación « ‹ › »

---

### PARTE 7: Formulario Mejorado
**Prioridad**: 🟡 BAJA

**Ya implementado parcialmente** en `moto-form.tsx`:
- ✅ Marca: Input con datalist
- ✅ Color: Input con datalist
- ✅ Tipo: Input con datalist
- ✅ Imagen: ImageUpload con drag & drop

**Falta agregar**:
- Número de motor (opcional)
- Número de cuadro/chasis (opcional)
- Observaciones (Textarea)

---

## 🔧 ESTRUCTURA RECOMENDADA

### Nuevos Componentes a Crear:

```
src/app/(dashboard)/admin/motos/
├── page.tsx (modificar)
├── page.tsx.backup (ya existe)
├── columns.tsx (modificar)
├── moto-form.tsx (ya existe, agregar campos)
├── components/
│   ├── bulk-actions-toolbar.tsx (NUEVO)
│   ├── bulk-state-dialog.tsx (NUEVO)
│   ├── bulk-image-dialog.tsx (NUEVO)
│   ├── motos-filters.tsx (NUEVO)
│   ├── stats-cards.tsx (NUEVO)
│   └── grid-view.tsx (NUEVO)
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN SUGERIDO

### Sesión 1 (próxima):
1. ✅ Stats Cards (visual impact, fácil)
2. ✅ Checkboxes + selección (base para todo)
3. ✅ Bulk Actions Toolbar básico (cambiar estado, eliminar)

### Sesión 2:
4. ✅ Filtros profesionales
5. ✅ Columnas mejoradas (imagen, badges)
6. ✅ Vista grilla toggle

### Sesión 3:
7. ✅ Export avanzado
8. ✅ Formulario mejorado
9. ✅ Testing completo
10. ✅ Deployment

---

## 📝 NOTAS IMPORTANTES

### Estado Actual del Código:
- Página actual es funcional con paginación y búsqueda
- Tiene DataTable de TanStack
- Tiene dialogs de create/edit/delete/view
- Tiene import/export básico

### NO Romper:
- ❌ No eliminar paginación existente
- ❌ No eliminar búsqueda existente
- ❌ No eliminar dialogs existentes
- ✅ Agregar features ENCIMA de lo que existe

### Testing Local:
```bash
npm run dev
# Ir a http://localhost:3000/admin/motos
# Login: admin@motolibre.com / admin123
```

### URLs de Prueba:
- Local: http://localhost:3000/admin/motos
- Producción: https://alquiler-motos-production-f27f.up.railway.app/admin/motos

---

## 🚀 PARA LA PRÓXIMA SESIÓN

### Comando para empezar:
```bash
cd /Users/dante/Documents/2026/Desarrollo\ Alquiler/motorent-v2
git status
npm run dev
```

### Prompt de inicio sugerido:
```
Continuar con implementación de Gestión Profesional de Motos.
Leer PENDING-MOTOS-PRO.md para contexto completo.
Empezar con PARTE 1 (Sesión 1): Stats Cards + Checkboxes + Bulk Actions.
```

### Variables de Entorno:
- Todas configuradas ✅
- R2 funcionando ✅
- DB conectada ✅

---

**Ready to continue!** 🚀
