import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { gastoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "fecha";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const categoria = url.searchParams.get("categoria");
    const motoId = url.searchParams.get("motoId");
    const desde = url.searchParams.get("desde");
    const hasta = url.searchParams.get("hasta");

    const allowedSorts = ["fecha", "monto", "concepto", "categoria", "createdAt"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "fecha";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { concepto: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
        { subcategoria: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoria) where.categoria = categoria;
    if (motoId) where.motoId = motoId;

    if (desde || hasta) {
      where.fecha = {};
      if (desde) (where.fecha as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.fecha as Record<string, unknown>).lte = new Date(hasta + "T23:59:59Z");
    }

    const [data, total] = await Promise.all([
      prisma.gasto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          moto: { select: { id: true, marca: true, modelo: true, patente: true } },
          proveedor: { select: { id: true, nombre: true } },
        },
      }),
      prisma.gasto.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching gastos:", err);
    return NextResponse.json({ data: [], total: 0, page: 1, limit: 15, totalPages: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = gastoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { motoId, proveedorId, fecha, ...rest } = parsed.data;

    const gasto = await prisma.gasto.create({
      data: {
        ...rest,
        motoId: motoId || null,
        proveedorId: proveedorId || null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(gasto, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating gasto:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
