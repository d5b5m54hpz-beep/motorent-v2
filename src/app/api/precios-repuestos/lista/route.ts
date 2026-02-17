import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.pricing.parts.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const search = searchParams.get("search") || "";
  const categoria = searchParams.get("categoria");
  const proveedorId = searchParams.get("proveedorId");
  const margenFiltro = searchParams.get("margen");
  const estadoFiltro = searchParams.get("estado");
  const orderBy = searchParams.get("orderBy") || "nombre";
  const orderDir = searchParams.get("orderDir") || "asc";

  try {
    // ─── 1. CONSTRUIR FILTROS ──────────────────────────────────────
    const where: any = { activo: true };

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { codigo: { contains: search, mode: "insensitive" } },
        { codigoFabricante: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoria && categoria !== "todos") {
      where.categoria = categoria;
    }

    if (proveedorId && proveedorId !== "todos") {
      where.proveedorId = proveedorId;
    }

    // ─── 2. OBTENER REPUESTOS ──────────────────────────────────────
    const [repuestos, total] = await Promise.all([
      prisma.repuesto.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          codigo: true,
          codigoFabricante: true,
          categoria: true,
          costoPromedioUsd: true,
          costoPromedioArs: true,
          precioVenta: true,
          stock: true,
          stockMinimo: true,
          proveedor: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy:
          orderBy === "margen"
            ? undefined
            : { [orderBy]: orderDir as "asc" | "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.repuesto.count({ where }),
    ]);

    // ─── 3. OBTENER CONFIGURACIÓN DE CATEGORÍAS ────────────────────
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

    // ─── 4. CALCULAR MÁRGENES Y APLICAR FILTROS ADICIONALES ────────
    let repuestosConMargen = repuestos.map((r) => {
      const costo = r.costoPromedioArs;
      const precio = r.precioVenta;
      const margen = precio > 0 ? (precio - costo) / precio : null;

      const config = configMap.get(r.categoria || "");
      const margenMinimo = config?.margenMinimo || 0.25;

      // Estado de stock
      let estadoStock = "OK";
      if (r.stock === 0) estadoStock = "SIN_STOCK";
      else if (r.stock <= r.stockMinimo) estadoStock = "CRITICO";
      else if (r.stock <= r.stockMinimo * 2) estadoStock = "BAJO";

      return {
        ...r,
        margen,
        margenMinimo,
        estadoStock,
      };
    });

    // Filtro de margen
    if (margenFiltro && margenFiltro !== "todos") {
      repuestosConMargen = repuestosConMargen.filter((r) => {
        if (margenFiltro === "sin-precio") return r.precioVenta === 0;
        if (!r.margen) return false;

        switch (margenFiltro) {
          case "critico":
            return r.margen < 0.10;
          case "bajo":
            return r.margen >= 0.10 && r.margen < 0.25;
          case "aceptable":
            return r.margen >= 0.25 && r.margen < 0.45;
          case "optimo":
            return r.margen >= 0.45 && r.margen < 0.60;
          case "alto":
            return r.margen >= 0.60;
          default:
            return true;
        }
      });
    }

    // Filtro de estado de stock
    if (estadoFiltro && estadoFiltro !== "todos") {
      repuestosConMargen = repuestosConMargen.filter((r) => {
        switch (estadoFiltro) {
          case "stock-ok":
            return r.estadoStock === "OK";
          case "stock-bajo":
            return r.estadoStock === "BAJO";
          case "stock-critico":
            return r.estadoStock === "CRITICO";
          case "sin-stock":
            return r.estadoStock === "SIN_STOCK";
          default:
            return true;
        }
      });
    }

    // Ordenar por margen si corresponde
    if (orderBy === "margen") {
      repuestosConMargen.sort((a, b) => {
        const margenA = a.margen || 0;
        const margenB = b.margen || 0;
        return orderDir === "asc" ? margenA - margenB : margenB - margenA;
      });
    }

    // ─── 5. RESPUESTA ──────────────────────────────────────────────
    return NextResponse.json({
      data: repuestosConMargen,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error en lista de precios:", err);
    return NextResponse.json(
      { error: "Error al cargar lista de precios" },
      { status: 500 }
    );
  }
}
