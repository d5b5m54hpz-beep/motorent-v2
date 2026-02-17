import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { subDays, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const periodo = searchParams.get("periodo") || "30d";
  const categoriaFiltro = searchParams.get("categoria");

  try {
    // Calcular fecha inicio según período
    const now = new Date();
    let fechaInicio: Date;
    let periodoLabel = "";

    switch (periodo) {
      case "90d":
        fechaInicio = subDays(now, 90);
        periodoLabel = "últimos 90 días";
        break;
      case "6m":
        fechaInicio = subMonths(now, 6);
        periodoLabel = "últimos 6 meses";
        break;
      case "12m":
        fechaInicio = subMonths(now, 12);
        periodoLabel = "últimos 12 meses";
        break;
      default: // 30d
        fechaInicio = subDays(now, 30);
        periodoLabel = "últimos 30 días";
    }

    // ─── 1. OBTENER REPUESTOS CON DATOS ────────────────────────────
    const where: any = { activo: true };
    if (categoriaFiltro) {
      where.categoria = categoriaFiltro;
    }

    const repuestos = await prisma.repuesto.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        categoria: true,
        costoPromedioArs: true,
        precioVenta: true,
        stock: true,
      },
    });

    // ─── 2. SIMULAR VENTAS (NOTA: Reemplazar con datos reales cuando existan) ────
    // Como no hay módulo de ventas aún, simulamos ventas basadas en rotación de inventario
    // Asumimos que cada producto vendió ~10% de su stock en el período
    const ventasSimuladas = repuestos.map((r) => {
      const cantidadVendida = Math.max(1, Math.floor(r.stock * 0.10));
      const ingreso = cantidadVendida * r.precioVenta;
      const costo = cantidadVendida * r.costoPromedioArs;
      const margen = ingreso - costo;
      const margenPct = ingreso > 0 ? margen / ingreso : 0;

      return {
        repuestoId: r.id,
        repuesto: r.nombre,
        categoria: r.categoria || "SIN_CATEGORIA",
        ventas: cantidadVendida,
        ingreso,
        costo,
        margenBruto: margen,
        margenPct,
      };
    });

    // ─── 3. TOTALES GENERALES ──────────────────────────────────────
    const totalVentas = ventasSimuladas.reduce((sum, v) => sum + v.ventas, 0);
    const ingresoTotal = ventasSimuladas.reduce((sum, v) => sum + v.ingreso, 0);
    const costoTotal = ventasSimuladas.reduce((sum, v) => sum + v.costo, 0);
    const margenBruto = ingresoTotal - costoTotal;
    const margenPct = ingresoTotal > 0 ? margenBruto / ingresoTotal : 0;

    // ─── 4. AGRUPAR POR CATEGORÍA ──────────────────────────────────
    const categorias = new Map<string, {
      ventas: number;
      ingreso: number;
      costo: number;
      productos: string[];
    }>();

    ventasSimuladas.forEach((v) => {
      if (!categorias.has(v.categoria)) {
        categorias.set(v.categoria, {
          ventas: 0,
          ingreso: 0,
          costo: 0,
          productos: [],
        });
      }

      const data = categorias.get(v.categoria)!;
      data.ventas += v.ventas;
      data.ingreso += v.ingreso;
      data.costo += v.costo;
      data.productos.push(v.repuesto);
    });

    const porCategoria = Array.from(categorias.entries()).map(([categoria, data]) => {
      const margenBruto = data.ingreso - data.costo;
      const margenPct = data.ingreso > 0 ? margenBruto / data.ingreso : 0;

      // Producto más vendido y más rentable (simplificado)
      const productosCategoria = ventasSimuladas.filter((v) => v.categoria === categoria);
      const masVendido = productosCategoria.sort((a, b) => b.ventas - a.ventas)[0];
      const masRentable = productosCategoria.sort((a, b) => b.margenBruto - a.margenBruto)[0];

      return {
        categoria,
        ventas: data.ventas,
        ingreso: Math.round(data.ingreso),
        costo: Math.round(data.costo),
        margenBruto: Math.round(margenBruto),
        margenPct,
        productoMasVendido: masVendido?.repuesto || "-",
        productoMasRentable: masRentable?.repuesto || "-",
      };
    }).sort((a, b) => b.ingreso - a.ingreso);

    // ─── 5. TOP PRODUCTOS ───────────────────────────────────────────
    const topVendidos = ventasSimuladas
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 10)
      .map((v) => ({
        repuesto: v.repuesto,
        categoria: v.categoria,
        ventas: v.ventas,
        ingreso: Math.round(v.ingreso),
      }));

    const topRentables = ventasSimuladas
      .sort((a, b) => b.margenBruto - a.margenBruto)
      .slice(0, 10)
      .map((v) => ({
        repuesto: v.repuesto,
        categoria: v.categoria,
        ingreso: Math.round(v.ingreso),
        margenBruto: Math.round(v.margenBruto),
        margenPct: v.margenPct,
      }));

    // ─── RESPUESTA FINAL ────────────────────────────────────────────
    return NextResponse.json({
      periodo: periodoLabel,
      totalVentas,
      ingresoTotal: Math.round(ingresoTotal),
      costoTotal: Math.round(costoTotal),
      margenBruto: Math.round(margenBruto),
      margenPct,
      porCategoria,
      topVendidos,
      topRentables,
      nota: "Datos simulados basados en rotación de inventario. Reemplazar con datos reales de ventas cuando estén disponibles.",
    });
  } catch (err: unknown) {
    console.error("Error en reporte-rentabilidad:", err);
    return NextResponse.json({ error: "Error al generar reporte" }, { status: 500 });
  }
}
