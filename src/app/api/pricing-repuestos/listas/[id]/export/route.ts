import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-permission';
import { OPERATIONS } from '@/lib/events';
import { prisma } from '@/lib/prisma';

// GET /api/pricing-repuestos/listas/[id]/export — Exportar lista de precios como CSV
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requirePermission(OPERATIONS.pricing.parts.list.view, 'view', ['OPERADOR']);
    if (error) return error;

    const { id } = await params;

    // 1. Obtener la lista de precios
    const lista = await prisma.listaPrecio.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        descripcion: true,
        autoCalcular: true,
        formulaMarkup: true,
      },
    });

    if (!lista) {
      return NextResponse.json({ error: 'Lista de precios no encontrada' }, { status: 404 });
    }

    // 2. Obtener todos los repuestos activos con sus precios
    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        categoria: true,
        costoPromedioArs: true,
        unidad: true,
      },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });

    // 3. Resolver precio para cada repuesto usando el motor de pricing
    const lineasCSV: string[] = [];

    // Header
    lineasCSV.push(
      [
        'Código',
        'Nombre',
        'Categoría',
        'Unidad',
        'Costo Promedio',
        `Precio ${lista.nombre}`,
        'Margen %',
        'Método',
      ].join(',')
    );

    // Datos
    for (const rep of repuestos) {
      let precio = 0;
      let metodo = '-';

      if (lista.autoCalcular && lista.formulaMarkup) {
        // Auto-cálculo (GAP 3)
        precio = Number(rep.costoPromedioArs) * Number(lista.formulaMarkup);
        metodo = `Auto (× ${lista.formulaMarkup})`;
      } else {
        // Buscar en itemListaPrecio o calcular con motor
        const itemLista = await prisma.itemListaPrecio.findFirst({
          where: {
            listaPrecioId: lista.id,
            repuestoId: rep.id,
            cantidadMinima: { lte: 1 },
            vigenciaDesde: { lte: new Date() },
            OR: [
              { vigenciaHasta: null },
              { vigenciaHasta: { gt: new Date() } },
            ],
          },
          orderBy: [{ cantidadMinima: 'desc' }, { vigenciaDesde: 'desc' }],
        });

        if (itemLista) {
          precio = Number(itemLista.precioArs);
          metodo = 'Precio manual';
        } else {
          // Calcular con markup por categoría
          const categoriaConfig = await prisma.categoriaRepuestoConfig.findFirst({
            where: { categoria: rep.categoria || '' },
          });

          const multiplicador = Number(categoriaConfig?.markupDefault ?? 2.0);
          precio = Number(rep.costoPromedioArs) * multiplicador;
          metodo = `Markup ${multiplicador}x`;
        }
      }

      const margen = precio > 0 ? ((precio - Number(rep.costoPromedioArs)) / precio) * 100 : 0;

      lineasCSV.push(
        [
          rep.codigo || '-',
          `"${rep.nombre.replace(/"/g, '""')}"`, // Escape comillas
          rep.categoria || '-',
          rep.unidad || '-',
          Number(rep.costoPromedioArs).toFixed(2),
          precio.toFixed(2),
          margen.toFixed(1),
          `"${metodo}"`,
        ].join(',')
      );
    }

    // 4. Generar archivo CSV
    const csvContent = lineasCSV.join('\n');
    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // BOM para Excel

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="lista-precios-${lista.codigo}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error('Error exporting lista de precios:', error);
    return NextResponse.json(
      { error: 'Error al exportar lista', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
