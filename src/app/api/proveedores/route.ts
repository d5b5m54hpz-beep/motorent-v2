import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { proveedorSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.supplier.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "nombre";
    const sortOrder = url.searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const activo = url.searchParams.get("activo");

    const allowedSorts = ["nombre", "rubro", "createdAt"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "nombre";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { contacto: { contains: search, mode: "insensitive" } },
        { rubro: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (activo !== null && activo !== undefined && activo !== "") {
      where.activo = activo === "true";
    }

    const [data, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          _count: { select: { repuestos: true } },
        },
      }),
      prisma.proveedor.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching proveedores:", err);
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
  const { error, userId } = await requirePermission(OPERATIONS.supplier.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = proveedorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.create({
      data: parsed.data,
    });

    eventBus.emit(OPERATIONS.supplier.create, "Proveedor", proveedor.id, { nombre: parsed.data.nombre, cuit: parsed.data.cuit, rubro: parsed.data.rubro }, userId).catch(err => console.error("Error emitting supplier.create event:", err));

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
