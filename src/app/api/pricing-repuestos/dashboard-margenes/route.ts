import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { subDays, subMonths, format, startOfMonth } from "date-fns";

interface CategoriaConfig {
  categoria: string;
  margenObjetivo: number;
  margenMinimo: number;
}

interface DashboardAlerta {
  tipo: string;
  severidad: "ALTA" | "MEDIA" | "BAJA_DEFINITIVA";
  mensaje: string;
  repuestoId?: string;
  accion: string;
}

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const periodo = searchParams.get("periodo") || "30d";

  try {
    // Calcular fecha inicio según período
    const now = new Date();
    let fechaInicio: Date;
    let mesesTendencia = 6;

    switch (periodo) {
      case "90d":
        fechaInicio = subDays(now, 90);
        mesesTendencia = 6;
        break;
      case "6m":
        fechaInicio = subMonths(now, 6);
        mesesTendencia = 6;
        break;
      case "12m":
        fechaInicio = subMonths(now, 12);
        mesesTendencia = 12;
        break;
      default: // 30d
        fechaInicio = subDays(now, 30);
        mesesTendencia = 6;
    }

    // ─── 1. TODOS LOS REPUESTOS CON DATOS ───────────────────────────
    const repuestos = await prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
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
      configCategorias.map((c) => [c.categoria, {
        categoria: c.categoria,
        margenObjetivo: Number(c.margenObjetivo),
        margenMinimo: Number(c.margenMinimo),
      } as CategoriaConfig])
    );

    // ─── 3. KPIs PRINCIPALES ────────────────────────────────────────
    const totalRepuestos = repuestos.length;
    let repuestosBajoMinimo = 0;
    let repuestosSinPrecio = 0;
    let repuestosMargenCritico = 0;
    let valorInventarioCosto = 0;
    let valorInventarioPrecio = 0;
    let sumaMargenPonderado = 0;
    let sumaMargenSimple = 0;
    let countMargen = 0;

    repuestos.forEach((r) => {
      const costo = Number(r.costoPromedioArs);
      const precio = Number(r.precioVenta);
      const stock = r.stock;

      // Valor inventario
      valorInventarioCosto += costo * stock;
      valorInventarioPrecio += precio * stock;

      if (precio === 0 || precio === null) {
        repuestosSinPrecio++;
        return;
      }

      const margen = precio > 0 ? (precio - costo) / precio : 0;
      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;

      // Margen simple
      sumaMargenSimple += margen;
      countMargen++;

      // Margen ponderado por valor
      const valorItem = precio * stock;
      sumaMargenPonderado += margen * valorItem;

      // Alertas
      if (margen < margenMinimo) repuestosBajoMinimo++;
      if (margen < 0.10) repuestosMargenCritico++;
    });

    const margenPromedioPortfolio =
      valorInventarioPrecio > 0
        ? sumaMargenPonderado / valorInventarioPrecio
        : 0;
    const margenPromedioSimple = countMargen > 0 ? sumaMargenSimple / countMargen : 0;
    const margenBrutoInventario =
      valorInventarioPrecio > 0
        ? (valorInventarioPrecio - valorInventarioCosto) / valorInventarioPrecio
        : 0;

    // ─── 4. CAMBIOS DE PRECIO EN EL PERÍODO ────────────────────────
    const cambiosPreciosPeriodo = await prisma.historialPrecioRepuesto.count({
      where: {
        createdAt: { gte: fechaInicio },
      },
    });

    // ─── 5. EMBARQUES EN TRÁNSITO ──────────────────────────────────
    const embarquesEnTransito = await prisma.embarqueImportacion.count({
      where: {
        estado: { in: ["EN_TRANSITO", "EN_PUERTO", "EN_ADUANA"] },
      },
    });

    // ─── 6. ÚLTIMO AJUSTE BULK ─────────────────────────────────────
    const ultimoLote = await prisma.loteCambioPrecio.findFirst({
      where: { aplicado: true, revertido: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    // ─── 7. MARGEN POR CATEGORÍA ───────────────────────────────────
    const categorias = new Map<string, {
      totalProductos: number;
      sumaMargen: number;
      valorInventario: number;
      config: CategoriaConfig | undefined;
    }>();

    repuestos.forEach((r) => {
      const cat = r.categoria || "SIN_CATEGORIA";
      if (!categorias.has(cat)) {
        categorias.set(cat, {
          totalProductos: 0,
          sumaMargen: 0,
          valorInventario: 0,
          config: configMap.get(cat),
        });
      }

      const data = categorias.get(cat)!;
      data.totalProductos++;
      data.valorInventario += Number(r.precioVenta) * r.stock;

      if (Number(r.precioVenta) > 0) {
        const margen = (Number(r.precioVenta) - Number(r.costoPromedioArs)) / Number(r.precioVenta);
        data.sumaMargen += margen;
      }
    });

    const porCategoria = Array.from(categorias.entries()).map(([categoria, data]) => {
      const margenPromedio = data.totalProductos > 0 ? data.sumaMargen / data.totalProductos : 0;
      const margenObjetivo = data.config?.margenObjetivo || 0.40;
      const margenMinimo = data.config?.margenMinimo || 0.25;

      let estado = "OK";
      if (margenPromedio < margenMinimo) estado = "CRITICO";
      else if (margenPromedio < margenObjetivo) estado = "BAJO";

      return {
        categoria,
        totalProductos: data.totalProductos,
        margenPromedio,
        margenObjetivo,
        margenMinimo,
        valorInventario: data.valorInventario,
        estado,
      };
    }).sort((a, b) => b.margenPromedio - a.margenPromedio);

    // ─── 8. DISTRIBUCIÓN DE MÁRGENES ───────────────────────────────
    let critico = 0;
    let bajo = 0;
    let aceptable = 0;
    let optimo = 0;

    repuestos.forEach((r) => {
      if (Number(r.precioVenta) === 0) return;

      const margen = (Number(r.precioVenta) - Number(r.costoPromedioArs)) / Number(r.precioVenta);
      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;
      const margenObjetivo = config?.margenObjetivo || 0.40;

      if (margen < 0.10) critico++;
      else if (margen < margenMinimo) bajo++;
      else if (margen < margenObjetivo) aceptable++;
      else optimo++;
    });

    // ─── 9. TOP 5 PEORES Y MEJORES MÁRGENES ────────────────────────
    const repuestosConMargen = repuestos
      .filter((r) => Number(r.precioVenta) > 0)
      .map((r) => {
        const margen = (Number(r.precioVenta) - Number(r.costoPromedioArs)) / Number(r.precioVenta);
        const config = configMap.get(r.categoria || "");
        const margenMinimo = config?.margenMinimo || 0.25;

        return {
          repuestoId: r.id,
          nombre: r.nombre,
          categoria: r.categoria,
          costo: Number(r.costoPromedioArs),
          precioVenta: Number(r.precioVenta),
          margen,
          margenMinimo,
          diferencia: margen - margenMinimo,
        };
      });

    const peoresMargenes = repuestosConMargen
      .sort((a, b) => a.margen - b.margen)
      .slice(0, 5);

    const mejoresMargenes = repuestosConMargen
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 5);

    // ─── 10. TENDENCIA DE COSTOS (ÚLTIMOS N MESES) ─────────────────
    const tendenciaCostos = [];
    for (let i = mesesTendencia - 1; i >= 0; i--) {
      const mesInicio = startOfMonth(subMonths(now, i));
      const mesFin = startOfMonth(subMonths(now, i - 1));

      // Snapshot de costos en ese mes (simplificado - usar último valor conocido)
      const repuestosMes = repuestos.filter((r) => Number(r.precioVenta) > 0);

      const costoPromedio = repuestosMes.length > 0
        ? repuestosMes.reduce((sum, r) => sum + Number(r.costoPromedioArs), 0) / repuestosMes.length
        : 0;

      const precioPromedio = repuestosMes.length > 0
        ? repuestosMes.reduce((sum, r) => sum + Number(r.precioVenta), 0) / repuestosMes.length
        : 0;

      const margen = precioPromedio > 0
        ? (precioPromedio - costoPromedio) / precioPromedio
        : 0;

      tendenciaCostos.push({
        mes: format(mesInicio, "yyyy-MM"),
        costoPromedio: Math.round(costoPromedio),
        precioPromedio: Math.round(precioPromedio),
        margen,
      });
    }

    // ─── 11. ALERTAS ACTIVAS ───────────────────────────────────────
    const alertas: DashboardAlerta[] = [];

    // Alertas de margen bajo
    repuestos.forEach((r) => {
      if (Number(r.precioVenta) === 0) return;

      const margen = (Number(r.precioVenta) - Number(r.costoPromedioArs)) / Number(r.precioVenta);
      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;

      if (margen < 0.10) {
        const precioSugerido = Math.ceil(Number(r.costoPromedioArs) / (1 - 0.10));
        alertas.push({
          tipo: "MARGEN_CRITICO",
          severidad: "ALTA",
          mensaje: `${r.nombre}: margen ${(margen * 100).toFixed(0)}% < 10% (crítico)`,
          repuestoId: r.id,
          accion: `Aumentar precio a $${precioSugerido.toLocaleString("es-AR")} para alcanzar 10% mínimo`,
        });
      } else if (margen < margenMinimo) {
        const precioSugerido = Math.ceil(Number(r.costoPromedioArs) / (1 - margenMinimo));
        alertas.push({
          tipo: "MARGEN_BAJO_MINIMO",
          severidad: "ALTA",
          mensaje: `${r.nombre}: margen ${(margen * 100).toFixed(0)}% < mínimo ${(margenMinimo * 100).toFixed(0)}%`,
          repuestoId: r.id,
          accion: `Aumentar precio a $${precioSugerido.toLocaleString("es-AR")} para alcanzar margen mínimo`,
        });
      }
    });

    // Alerta de repuestos sin precio
    if (repuestosSinPrecio > 0) {
      alertas.push({
        tipo: "SIN_PRECIO",
        severidad: "MEDIA",
        mensaje: `${repuestosSinPrecio} repuestos sin precio de venta configurado`,
        accion: "Configurar precios en el tab Precios",
      });
    }

    // Alerta de embarques por llegar
    if (embarquesEnTransito > 0) {
      alertas.push({
        tipo: "EMBARQUE_LLEGANDO",
        severidad: "BAJA_DEFINITIVA",
        mensaje: `${embarquesEnTransito} embarques en tránsito`,
        accion: "Preparar recálculo de precios al confirmar llegada",
      });
    }

    // ⭐ GAP 6: Alerta de cambio de tipo de cambio
    // Obtener último TC registrado en el sistema
    const ultimoEmbarque = await prisma.embarqueImportacion.findFirst({
      where: { tipoCambioArsUsd: { not: null } },
      orderBy: { fechaDespacho: 'desc' },
      select: { tipoCambioArsUsd: true, fechaDespacho: true },
    });

    if (ultimoEmbarque?.tipoCambioArsUsd) {
      // TC actual (en producción vendría de API externa, aquí asumimos 1200 ARS/USD)
      const tcActual = 1200; // TODO: Obtener de API externa (dolarapi.com, etc.)
      const tcAnterior = Number(ultimoEmbarque.tipoCambioArsUsd);
      const variacionTC = ((tcActual - tcAnterior) / tcAnterior) * 100;
      const umbralAlerta = 10; // 10% de variación

      if (Math.abs(variacionTC) >= umbralAlerta) {
        alertas.push({
          tipo: "TIPO_CAMBIO",
          severidad: variacionTC > 20 ? "ALTA" : "MEDIA",
          mensaje: `Tipo de cambio varió ${variacionTC > 0 ? '+' : ''}${variacionTC.toFixed(1)}% desde último embarque (${tcAnterior.toFixed(2)} → ${tcActual.toFixed(2)} ARS/USD)`,
          accion: `Considerar ajuste de precios ${variacionTC > 0 ? 'al alza' : 'a la baja'} para mantener márgenes`,
        });
      }
    }

    // Ordenar por severidad
    const severidadOrder = { ALTA: 0, MEDIA: 1, BAJA: 2 };
    alertas.sort((a, b) => severidadOrder[a.severidad as keyof typeof severidadOrder] - severidadOrder[b.severidad as keyof typeof severidadOrder]);

    // ─── 12. ÚLTIMOS CAMBIOS DE PRECIO ─────────────────────────────
    const ultimosCambiosRaw = await prisma.historialPrecioRepuesto.findMany({
      where: {
        createdAt: { gte: subDays(now, 30) },
      },
      include: {
        repuesto: { select: { nombre: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const ultimosCambios = ultimosCambiosRaw.map((h) => {
      const cambio = h.precioAnterior && Number(h.precioAnterior) > 0
        ? ((Number(h.precioNuevo) - Number(h.precioAnterior)) / Number(h.precioAnterior)) * 100
        : 0;

      return {
        repuesto: h.repuesto.nombre,
        fecha: format(new Date(h.createdAt), "dd/MM/yyyy"),
        precioAnterior: Number(h.precioAnterior) || 0,
        precioNuevo: Number(h.precioNuevo),
        cambio: cambio > 0 ? `+${cambio.toFixed(1)}%` : `${cambio.toFixed(1)}%`,
        motivo: h.tipoCambio,
        loteId: h.loteId,
      };
    });

    // ─── RESPUESTA FINAL ────────────────────────────────────────────
    return NextResponse.json({
      kpis: {
        margenPromedioPortfolio,
        margenPromedioSimple,
        tendenciaMargen: 0, // TODO: calcular vs período anterior
        totalRepuestos,
        repuestosBajoMinimo,
        repuestosSinPrecio,
        repuestosMargenCritico,
        valorInventarioCosto,
        valorInventarioPrecio,
        margenBrutoInventario,
        cambiosPreciosPeriodo,
        embarquesEnTransito,
        ultimoAjusteBulk: ultimoLote?.createdAt || null,
      },
      porCategoria,
      distribucionMargenes: {
        critico,
        bajo,
        aceptable,
        optimo,
      },
      peoresMargenes,
      mejoresMargenes,
      tendenciaCostos,
      alertas: alertas.slice(0, 10), // Top 10
      ultimosCambios,
    });
  } catch (err: unknown) {
    console.error("Error en dashboard-margenes:", err);
    return NextResponse.json({ error: "Error al cargar dashboard" }, { status: 500 });
  }
}
