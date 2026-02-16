import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categoria, ajuste } = body; // ajuste en porcentaje (ej: 10 = +10%, -5 = -5%)

    if (!categoria || ajuste === undefined) {
      return NextResponse.json(
        { error: "Categoría y ajuste son requeridos" },
        { status: 400 }
      );
    }

    // ─── 1. OBTENER REPUESTOS DE LA CATEGORÍA ──────────────────────
    const where: any = { activo: true, precioVenta: { gt: 0 } };
    if (categoria !== "TODOS") {
      where.categoria = categoria;
    }

    const repuestos = await prisma.repuesto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        categoria: true,
        costoPromedioArs: true,
        precioVenta: true,
      },
    });

    // ─── 2. OBTENER CONFIGURACIÓN DE CATEGORÍAS ────────────────────
    const configCategorias = await prisma.categoriaRepuestoConfig.findMany({
      select: {
        categoria: true,
        margenMinimo: true,
        margenObjetivo: true,
      },
    });

    const configMap = new Map(
      configCategorias.map((c) => [c.categoria, c])
    );

    // ─── 3. SIMULAR CAMBIOS ────────────────────────────────────────
    let margenPromedioActual = 0;
    let margenPromedioNuevo = 0;
    let itemsSobrePrecio = 0;

    const detalle = repuestos.map((r) => {
      const precioActual = r.precioVenta;
      const precioNuevo = Math.round(precioActual * (1 + ajuste / 100));
      const margenActual = (precioActual - r.costoPromedioArs) / precioActual;
      const margenNuevo = (precioNuevo - r.costoPromedioArs) / precioNuevo;

      margenPromedioActual += margenActual;
      margenPromedioNuevo += margenNuevo;

      const config = configMap.get(r.categoria || "");
      const margenObjetivo = config?.margenObjetivo || 0.45;

      if (margenNuevo > 0.60 || margenNuevo > margenObjetivo * 1.5) {
        itemsSobrePrecio++;
      }

      return {
        repuesto: r.nombre,
        categoria: r.categoria,
        precioActual,
        precioNuevo,
        margenActual,
        margenNuevo,
      };
    });

    const totalRepuestos = repuestos.length;
    margenPromedioActual = totalRepuestos > 0 ? margenPromedioActual / totalRepuestos : 0;
    margenPromedioNuevo = totalRepuestos > 0 ? margenPromedioNuevo / totalRepuestos : 0;

    // Estimación de ingreso mensual (simplificado)
    const ingresoEstimado = repuestos.reduce(
      (sum, r) => sum + (r.precioVenta * (ajuste / 100)),
      0
    );

    // ─── 4. RESPUESTA ──────────────────────────────────────────────
    return NextResponse.json({
      totalRepuestos,
      ajustePorcentaje: ajuste,
      margenPromedioActual,
      margenPromedioNuevo,
      itemsSobrePrecio,
      ingresoEstimado: Math.round(ingresoEstimado),
      detalle: detalle.slice(0, 10), // Top 10 para preview
    });
  } catch (err: unknown) {
    console.error("Error en simulación:", err);
    return NextResponse.json(
      { error: "Error al simular escenario" },
      { status: 500 }
    );
  }
}
