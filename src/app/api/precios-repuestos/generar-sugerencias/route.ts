import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // ─── 1. OBTENER REPUESTOS CON PRECIOS ─────────────────────────
    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        categoria: true,
        costoPromedioArs: true,
        precioVenta: true,
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

    // ─── 3. GENERAR SUGERENCIAS BASADAS EN LÓGICA PURA ────────────
    const sugerencias: any[] = [];

    repuestos.forEach((r) => {
      const costo = r.costoPromedioArs;
      const precio = r.precioVenta;

      // Configuración de la categoría
      const config = configMap.get(r.categoria || "");
      const margenObjetivo = config?.margenObjetivo || 0.45; // default 45%
      const margenMinimo = config?.margenMinimo || 0.25; // default 25%

      // ─── CASO 1: Repuesto sin precio definido ─────────────────────
      if (precio === 0 && costo > 0) {
        const precioSugerido = Math.ceil((costo / (1 - margenObjetivo)) / 10) * 10;
        sugerencias.push({
          repuestoId: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          categoria: r.categoria,
          tipo: "DEFINIR",
          severidad: "CRITICO",
          costoLanded: Math.round(costo),
          precioActual: 0,
          margenActual: 0,
          precioSugerido,
          margenSugerido: margenObjetivo,
          motivo: `Repuesto sin precio de venta definido. Precio sugerido basado en margen objetivo ${(margenObjetivo * 100).toFixed(0)}%.`,
        });
        return;
      }

      if (precio === 0) return;

      const margenActual = (precio - costo) / precio;

      // ─── CASO 2: Margen debajo del mínimo → SUBIR ─────────────────
      if (margenActual < margenMinimo) {
        const precioSugerido = Math.ceil((costo / (1 - margenObjetivo)) / 10) * 10;
        const margenSugerido = (precioSugerido - costo) / precioSugerido;

        sugerencias.push({
          repuestoId: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          categoria: r.categoria,
          tipo: "SUBIR",
          severidad: margenActual < 0.10 ? "CRITICO" : "ALTO",
          costoLanded: Math.round(costo),
          precioActual: precio,
          margenActual,
          precioSugerido,
          margenSugerido,
          motivo: `Margen ${(margenActual * 100).toFixed(1)}% está ${margenActual < 0.10 ? "muy" : ""} debajo del mínimo ${(margenMinimo * 100).toFixed(0)}%. Precio sugerido basado en margen objetivo ${(margenObjetivo * 100).toFixed(0)}%.`,
        });
        return;
      }

      // ─── CASO 3: Margen excesivo (>150% del objetivo) → BAJAR ────
      if (margenActual > margenObjetivo * 1.5) {
        const precioSugerido = Math.ceil((costo / (1 - margenObjetivo)) / 10) * 10;
        const margenSugerido = (precioSugerido - costo) / precioSugerido;

        sugerencias.push({
          repuestoId: r.id,
          codigo: r.codigo,
          nombre: r.nombre,
          categoria: r.categoria,
          tipo: "BAJAR",
          severidad: "INFO",
          costoLanded: Math.round(costo),
          precioActual: precio,
          margenActual,
          precioSugerido,
          margenSugerido,
          motivo: `Margen ${(margenActual * 100).toFixed(1)}% muy por encima del objetivo ${(margenObjetivo * 100).toFixed(0)}%. Reducir precio mejora competitividad sin sacrificar rentabilidad.`,
        });
      }
    });

    // ─── 4. ORDENAR POR SEVERIDAD ──────────────────────────────────
    const severidadOrder: Record<string, number> = { CRITICO: 0, ALTO: 1, INFO: 2 };
    sugerencias.sort(
      (a, b) =>
        severidadOrder[a.severidad] - severidadOrder[b.severidad] ||
        a.margenActual - b.margenActual
    );

    // ─── 5. RESPUESTA ──────────────────────────────────────────────
    return NextResponse.json({
      total: sugerencias.length,
      sugerencias: sugerencias.slice(0, 50), // Top 50
    });
  } catch (err: unknown) {
    console.error("Error generando sugerencias:", err);
    return NextResponse.json(
      { error: "Error al generar sugerencias" },
      { status: 500 }
    );
  }
}
