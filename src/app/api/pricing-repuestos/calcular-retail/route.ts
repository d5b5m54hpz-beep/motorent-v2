import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";
import { randomUUID } from "crypto";

interface RetailCalculationItem {
  repuestoId: string;
  nombre: string;
  categoria: string | null;
  costo: number;
  precioActual: number;
  precioCalculado: number;
  margenActual: number;
  margenNuevo: number;
  reglaAplicada: string;
  cambio: string;
  cambioPct: number;
}

function redondearPrecio(precio: number, metodo?: string | null): number {
  if (!metodo || metodo === "NONE") return precio;
  if (metodo === "NEAREST_10") return Math.round(precio / 10) * 10;
  if (metodo === "NEAREST_50") return Math.round(precio / 50) * 50;
  if (metodo === "NEAREST_99") {
    const base = Math.floor(precio / 100) * 100;
    return base + 99;
  }
  return precio;
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.pricing.parts.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const {
      repuestoIds,
      categorias,
      soloSinPrecio = false,
      preview = true,
    } = body;

    // Construir filtro
    const where: Prisma.RepuestoWhereInput = { activo: true };

    if (repuestoIds && repuestoIds.length > 0) {
      where.id = { in: repuestoIds };
    }

    if (categorias && categorias.length > 0) {
      where.categoria = { in: categorias };
    }

    if (soloSinPrecio) {
      where.precioVenta = 0;
    }

    // Obtener repuestos
    const repuestos = await prisma.repuesto.findMany({ where });

    // Obtener lista B2C
    const listaB2C = await prisma.listaPrecio.findUnique({
      where: { codigo: "B2C" },
    });

    if (!listaB2C) {
      return NextResponse.json(
        { error: "Lista B2C no encontrada" },
        { status: 500 }
      );
    }

    // Obtener todas las reglas de markup
    const reglas = await prisma.reglaMarkup.findMany({
      where: { activa: true },
      orderBy: [{ categoria: "desc" }, { prioridad: "desc" }],
    });

    // Obtener configs de categoría
    const categoriasConfig = await prisma.categoriaRepuestoConfig.findMany();
    const configMap = new Map(categoriasConfig.map((c) => [c.categoria, c]));

    const items: RetailCalculationItem[] = [];
    let suben = 0;
    let bajan = 0;
    let sinCambio = 0;
    let sumaMargenActual = 0;
    let sumaMargenNuevo = 0;

    for (const repuesto of repuestos) {
      const costo = repuesto.costoPromedioArs || repuesto.precioCompra || 0;

      if (costo === 0) continue;

      // Buscar regla de markup aplicable
      const reglaAplicable = reglas.find((r) => {
        // Verificar categoría
        if (r.categoria && r.categoria !== repuesto.categoria) return false;

        // Verificar banda de costo
        if (r.costoBandaDesde !== null && costo < r.costoBandaDesde) return false;
        if (r.costoBandaHasta !== null && costo >= r.costoBandaHasta) return false;

        // Verificar OEM
        if (r.esOEM !== null && r.esOEM !== repuesto.esOEM) return false;

        return true;
      });

      let multiplicador = 2.0;
      let reglaAplicada = "Markup default (2.0x)";
      let redondeo: string | null = null;

      if (reglaAplicable) {
        multiplicador = reglaAplicable.multiplicador;
        reglaAplicada = reglaAplicable.nombre;
        redondeo = reglaAplicable.redondeo;
      } else {
        // Usar config de categoría
        const config = configMap.get(repuesto.categoria || "");
        if (config) {
          multiplicador = config.markupDefault;
          reglaAplicada = `Markup ${repuesto.categoria} (${multiplicador}x)`;
        }
      }

      const precioCalculado = redondearPrecio(costo * multiplicador, redondeo);
      const precioActual = repuesto.precioVenta || 0;

      const margenActual =
        precioActual > 0 ? (precioActual - costo) / precioActual : 0;
      const margenNuevo = (precioCalculado - costo) / precioCalculado;

      const cambio =
        precioActual > 0
          ? ((precioCalculado - precioActual) / precioActual) * 100
          : 100;

      if (precioCalculado > precioActual) suben++;
      else if (precioCalculado < precioActual) bajan++;
      else sinCambio++;

      sumaMargenActual += margenActual;
      sumaMargenNuevo += margenNuevo;

      items.push({
        repuestoId: repuesto.id,
        nombre: repuesto.nombre,
        categoria: repuesto.categoria,
        costo: Number(costo.toFixed(2)),
        precioActual: Number(precioActual.toFixed(2)),
        precioCalculado: Number(precioCalculado.toFixed(2)),
        margenActual: Number(margenActual.toFixed(4)),
        margenNuevo: Number(margenNuevo.toFixed(4)),
        reglaAplicada,
        cambio: `${cambio > 0 ? "+" : ""}${cambio.toFixed(1)}%`,
        cambioPct: cambio,
      });
    }

    const loteId = randomUUID();

    const resumen = {
      total: items.length,
      suben,
      bajan,
      sinCambio,
      margenPromedioActual: items.length > 0 ? sumaMargenActual / items.length : 0,
      margenPromedioNuevo: items.length > 0 ? sumaMargenNuevo / items.length : 0,
    };

    // Si no es preview, crear lote pendiente
    if (!preview) {
      await prisma.loteCambioPrecio.create({
        data: {
          id: loteId,
          descripcion: `Recálculo retail automático`,
          tipo: "RECALCULO_COSTO",
          cantidadItems: items.length,
          parametros: { categorias, soloSinPrecio },
          aplicado: false,
          usuario: userId || "sistema",
        },
      });
    }

    return NextResponse.json({
      loteId: preview ? null : loteId,
      items,
      resumen,
    });
  } catch (err: unknown) {
    console.error("Error calculando retail:", err);
    return NextResponse.json(
      { error: "Error al calcular precios" },
      { status: 500 }
    );
  }
}
