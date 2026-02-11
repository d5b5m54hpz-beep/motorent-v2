import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { proveedorSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

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
        _count: { select: { mantenimientos: true, repuestos: true } },
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
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
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

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
