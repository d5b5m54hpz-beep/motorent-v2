import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // ─── 1. OBTENER TODOS LOS REPUESTOS ACTIVOS CON PRECIOS ───────
    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        categoria: true,
        costoPromedioArs: true,
        precioVenta: true,
        stock: true,
      },
    });

    // ─── 2. CONFIGURACIÓN DE CATEGORÍAS ────────────────────────────
    const configCategorias = await prisma.categoriaRepuestoConfig.findMany({
      select: {
        categoria: true,
        margenObjetivo: true,
        margenMinimo: true,
      },
    });

    const configMap = new Map(
      configCategorias.map((c) => [c.categoria, c])
    );

    // ─── 3. CALCULAR KPIs ──────────────────────────────────────────
    let sumaMargenPonderado = 0;
    let valorInventarioCosto = 0;
    let valorInventarioPrecio = 0;
    let itemsBajoMargen = 0;

    const distribucion = {
      critico: 0,    // < 10%
      bajo: 0,       // 10-25%
      aceptable: 0,  // 25-45%
      optimo: 0,     // 45-60%
      alto: 0,       // > 60%
    };

    repuestos.forEach((r) => {
      const costo = r.costoPromedioArs;
      const precio = r.precioVenta;
      const stock = r.stock;

      valorInventarioCosto += costo * stock;
      valorInventarioPrecio += precio * stock;

      if (precio === 0) return;

      const margen = (precio - costo) / precio;
      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;

      // Margen ponderado por valor
      const valorItem = precio * stock;
      sumaMargenPonderado += margen * valorItem;

      // Items bajo margen mínimo
      if (margen < margenMinimo) itemsBajoMargen++;

      // Distribución de márgenes
      if (margen < 0.10) distribucion.critico++;
      else if (margen < 0.25) distribucion.bajo++;
      else if (margen < 0.45) distribucion.aceptable++;
      else if (margen < 0.60) distribucion.optimo++;
      else distribucion.alto++;
    });

    const margenPromedio =
      valorInventarioPrecio > 0
        ? sumaMargenPonderado / valorInventarioPrecio
        : 0;

    // ─── 4. MARGEN POR CATEGORÍA ───────────────────────────────────
    const categorias = new Map<
      string,
      {
        totalProductos: number;
        sumaMargen: number;
        config: any;
      }
    >();

    repuestos.forEach((r) => {
      const cat = r.categoria || "SIN_CATEGORIA";
      if (!categorias.has(cat)) {
        categorias.set(cat, {
          totalProductos: 0,
          sumaMargen: 0,
          config: configMap.get(cat),
        });
      }

      const data = categorias.get(cat)!;
      data.totalProductos++;

      if (r.precioVenta > 0) {
        const margen = (r.precioVenta - r.costoPromedioArs) / r.precioVenta;
        data.sumaMargen += margen;
      }
    });

    const margenPorCategoria = Array.from(categorias.entries())
      .map(([categoria, data]) => {
        const margenPromedio =
          data.totalProductos > 0 ? data.sumaMargen / data.totalProductos : 0;
        const margenObjetivo = data.config?.margenObjetivo || 0.45;

        return {
          categoria,
          totalProductos: data.totalProductos,
          margenPromedio,
          margenObjetivo,
        };
      })
      .sort((a, b) => b.totalProductos - a.totalProductos);

    // ─── 5. RESPUESTA ──────────────────────────────────────────────
    return NextResponse.json({
      kpis: {
        margenPromedio,
        itemsBajoMargen,
        valorInventarioCosto,
        valorInventarioPrecio,
      },
      distribucion,
      margenPorCategoria,
    });
  } catch (err: unknown) {
    console.error("Error en dashboard:", err);
    return NextResponse.json(
      { error: "Error al cargar dashboard" },
      { status: 500 }
    );
  }
}
