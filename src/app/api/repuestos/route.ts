import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { repuestoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "nombre";
    const sortOrder = url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const stockBajo = url.searchParams.get("stockBajo");

    const allowedSorts = ["nombre", "codigo", "stock", "precioCompra", "precioVenta", "createdAt"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "nombre";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { codigo: { contains: search, mode: "insensitive" } },
        { categoria: { contains: search, mode: "insensitive" } },
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

    if (stockBajo === "true") {
      const filtered = data.filter((r) => r.stock <= r.stockMinimo);
      return NextResponse.json({
        data: filtered,
        total: filtered.length,
        page,
        limit,
        totalPages: 1,
      });
    }

    return NextResponse.json({
      data,
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
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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

    const { proveedorId, ...rest } = parsed.data;

    const repuesto = await prisma.repuesto.create({
      data: {
        ...rest,
        proveedorId: proveedorId || null,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
      },
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
