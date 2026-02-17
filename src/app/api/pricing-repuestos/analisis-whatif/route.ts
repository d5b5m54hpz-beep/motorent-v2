import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const escenario = searchParams.get("escenario") || "TC_CAMBIO";
  const variacion = parseFloat(searchParams.get("variacion") || "0");
  const categoriasParam = searchParams.get("categorias");
  const categoriasFiltro = categoriasParam ? categoriasParam.split(",") : null;

  try {
    // ─── 1. OBTENER REPUESTOS ──────────────────────────────────────
    const where: any = { activo: true, precioVenta: { gt: 0 } };
    if (categoriasFiltro && categoriasFiltro.length > 0) {
      where.categoria = { in: categoriasFiltro };
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

    // ─── 2. OBTENER CONFIGURACIÓN DE MÁRGENES ──────────────────────
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

    // ─── 3. SIMULAR IMPACTO SEGÚN ESCENARIO ────────────────────────
    const detalle = repuestos.map((r) => {
      let costoSimulado = r.costoPromedioArs;

      switch (escenario) {
        case "TC_CAMBIO":
          // Tipo de cambio: afecta costo directo
          costoSimulado = r.costoPromedioArs * (1 + variacion);
          break;

        case "FLETE_CAMBIO":
          // Flete: asumimos que representa ~15% del costo landed
          costoSimulado = r.costoPromedioArs * (1 + variacion * 0.15);
          break;

        case "ARANCEL_CAMBIO":
          // Arancel: aplicar nueva tasa sobre costo FOB (asumimos ~60% del costo total)
          const costoFOB = r.costoPromedioArs * 0.60;
          const arancelNuevo = costoFOB * variacion;
          const arancelActual = costoFOB * 0.10; // Asumimos 10% actual
          costoSimulado = r.costoPromedioArs - arancelActual + arancelNuevo;
          break;

        case "MARKUP_CAMBIO":
          // Markup: NO afecta costo, solo precio
          // En este caso costoSimulado = costoActual
          break;

        default:
          costoSimulado = r.costoPromedioArs;
      }

      const precioActual = r.precioVenta;
      let precioSimulado = precioActual;

      if (escenario === "MARKUP_CAMBIO") {
        // Aplicar variación al precio directamente
        precioSimulado = precioActual * (1 + variacion);
      }

      const margenActual = precioActual > 0
        ? (precioActual - r.costoPromedioArs) / precioActual
        : 0;

      const margenSimulado = precioSimulado > 0
        ? (precioSimulado - costoSimulado) / precioSimulado
        : 0;

      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;

      let estado = "OK";
      if (margenSimulado < 0.10) estado = "CRITICO";
      else if (margenSimulado < margenMinimo) estado = "BAJO";

      return {
        repuestoId: r.id,
        repuesto: r.nombre,
        categoria: r.categoria,
        costoActual: Math.round(r.costoPromedioArs),
        costoSimulado: Math.round(costoSimulado),
        precioActual,
        precioSimulado: Math.round(precioSimulado),
        margenActual,
        margenSimulado,
        estado,
      };
    });

    // ─── 4. CALCULAR IMPACTO GLOBAL ────────────────────────────────
    const productosAfectados = detalle.length;

    const costoPromedioActual = detalle.length > 0
      ? detalle.reduce((sum, d) => sum + d.costoActual, 0) / detalle.length
      : 0;

    const costoPromedioNuevo = detalle.length > 0
      ? detalle.reduce((sum, d) => sum + d.costoSimulado, 0) / detalle.length
      : 0;

    const margenActualPromedio = detalle.length > 0
      ? detalle.reduce((sum, d) => sum + d.margenActual, 0) / detalle.length
      : 0;

    const margenNuevoPromedio = detalle.length > 0
      ? detalle.reduce((sum, d) => sum + d.margenSimulado, 0) / detalle.length
      : 0;

    const productosBajoMinimoActual = detalle.filter((d) => {
      const config = configMap.get(d.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;
      return d.margenActual < margenMinimo;
    }).length;

    const productosBajoMinimo = detalle.filter((d) => {
      const config = configMap.get(d.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;
      return d.margenSimulado < margenMinimo;
    }).length;

    // Calcular ajuste necesario para mantener margen
    let ajusteNecesario = 0;
    if (margenNuevoPromedio < margenActualPromedio) {
      // Cuánto hay que subir precios para mantener el margen actual
      const costoAumento = costoPromedioNuevo - costoPromedioActual;
      const precioActualPromedio = detalle.length > 0
        ? detalle.reduce((sum, d) => sum + d.precioActual, 0) / detalle.length
        : 0;

      if (precioActualPromedio > 0) {
        ajusteNecesario = (costoAumento / precioActualPromedio) * 100;
      }
    }

    // ─── 5. PRODUCTOS MÁS AFECTADOS ────────────────────────────────
    const masAfectados = detalle
      .sort((a, b) => (a.margenSimulado - a.margenActual) - (b.margenSimulado - b.margenActual))
      .slice(0, 10);

    // ─── RESPUESTA FINAL ────────────────────────────────────────────
    let escenarioLabel = "";
    switch (escenario) {
      case "TC_CAMBIO":
        escenarioLabel = `Tipo de cambio ${variacion > 0 ? "+" : ""}${(variacion * 100).toFixed(0)}%`;
        break;
      case "FLETE_CAMBIO":
        escenarioLabel = `Flete internacional ${variacion > 0 ? "+" : ""}${(variacion * 100).toFixed(0)}%`;
        break;
      case "ARANCEL_CAMBIO":
        escenarioLabel = `Arancel ${(variacion * 100).toFixed(0)}%`;
        break;
      case "MARKUP_CAMBIO":
        escenarioLabel = `Markup general ${variacion > 0 ? "+" : ""}${(variacion * 100).toFixed(0)}%`;
        break;
    }

    return NextResponse.json({
      escenario: escenarioLabel,
      impacto: {
        costoPromedioActual: Math.round(costoPromedioActual),
        costoPromedioNuevo: Math.round(costoPromedioNuevo),
        margenActualPromedio,
        margenNuevoPromedio,
        productosAfectados,
        productosBajoMinimoActual,
        productosBajoMinimo,
        ajusteNecesario: ajusteNecesario > 0 ? `+${ajusteNecesario.toFixed(1)}%` : `${ajusteNecesario.toFixed(1)}%`,
      },
      detalle: masAfectados,
    });
  } catch (err: unknown) {
    console.error("Error en analisis-whatif:", err);
    return NextResponse.json({ error: "Error al simular escenario" }, { status: 500 });
  }
}
