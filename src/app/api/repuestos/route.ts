import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { repuestoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.part.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "nombre";
    const sortOrder = url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const stockBajo = url.searchParams.get("stockBajo");
    const categoria = url.searchParams.get("categoria");
    const proveedorId = url.searchParams.get("proveedorId");
    const activo = url.searchParams.get("activo");
    const ubicacion = url.searchParams.get("ubicacion");

    const allowedSorts = ["nombre", "codigo", "stock", "precioCompra", "precioVenta", "createdAt"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "nombre";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { codigo: { contains: search, mode: "insensitive" } },
        { categoria: { contains: search, mode: "insensitive" } },
        { marca: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoria) {
      where.categoria = categoria;
    }

    if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    if (activo !== null && activo !== undefined && activo !== "") {
      where.activo = activo === "true";
    }

    if (ubicacion) {
      where.ubicacion = { contains: ubicacion, mode: "insensitive" };
    }

    if (stockBajo === "true") {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { stock: { lte: prisma.repuesto.fields.stockMinimo } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.repuesto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      }),
      prisma.repuesto.count({ where }),
    ]);

    // Calcular unidades en tránsito para cada repuesto
    const repuestoIds = data.map((r) => r.id);
    const embarquesActivos = await prisma.itemEmbarque.findMany({
      where: {
        repuestoId: { in: repuestoIds },
        embarque: {
          estado: {
            in: ["EN_TRANSITO", "EN_PUERTO", "EN_ADUANA", "DESPACHADO_PARCIAL", "EN_RECEPCION"],
          },
        },
      },
      select: {
        repuestoId: true,
        cantidad: true,
        embarque: {
          select: {
            referencia: true,
          },
        },
      },
    });

    // Agrupar por repuestoId
    const transitoMap = new Map<string, { total: number; embarques: { embarqueRef: string; cantidad: number }[] }>();
    for (const item of embarquesActivos) {
      if (!item.repuestoId) continue;
      const existing = transitoMap.get(item.repuestoId) || { total: 0, embarques: [] };
      existing.total += item.cantidad;
      existing.embarques.push({
        embarqueRef: item.embarque.referencia,
        cantidad: item.cantidad,
      });
      transitoMap.set(item.repuestoId, existing);
    }

    // Agregar enTransito a cada repuesto
    const dataWithTransit = data.map((r) => {
      const transitInfo = transitoMap.get(r.id);
      return {
        ...r,
        enTransito: transitInfo?.total ?? 0,
        embarquesEnTransito: transitInfo?.embarques ?? [],
      };
    });

    if (stockBajo === "true") {
      const filtered = dataWithTransit.filter((r) => r.stock <= r.stockMinimo);
      return NextResponse.json({
        data: filtered,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      });
    }

    return NextResponse.json({
      data: dataWithTransit,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching repuestos:", err);
    return NextResponse.json({
      data: [],
      total: 0,
      page: 1,
      limit: 15,
      totalPages: 0,
    });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.part.create,
    "create",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = repuestoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { proveedorId, stock, ...rest } = parsed.data;
    const stockValue = stock ?? 0;

    const repuesto = await prisma.$transaction(async (tx) => {
      const newRepuesto = await tx.repuesto.create({
        data: {
          ...rest,
          stock: stockValue,
          proveedorId: proveedorId || null,
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      if (stockValue > 0) {
        await tx.movimientoStock.create({
          data: {
            repuestoId: newRepuesto.id,
            tipo: "IMPORTACION",
            cantidad: stockValue,
            stockAnterior: 0,
            stockNuevo: stockValue,
            motivo: "Stock inicial",
            usuario: userId || undefined,
          },
        });
      }

      return newRepuesto;
    });

    // Emit creation event
    eventBus.emit(
      OPERATIONS.inventory.part.create,
      "Repuesto",
      repuesto.id,
      { nombre: rest.nombre, codigo: rest.codigo, cantidad: stockValue, costoUnitario: rest.precioCompra },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.part.create event:", err);
    });

    return NextResponse.json(repuesto, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating repuesto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
