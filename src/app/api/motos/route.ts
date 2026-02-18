import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";
import { motoSchema } from "@/lib/validations";

const ALLOWED_SORT_COLUMNS = [
  "marca", "modelo", "anio", "patente", "cilindrada",
  "precioMensual", "estado", "createdAt",
];

// GET /api/motos — list all motos (paginated, searchable, sortable)
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "15");
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const estado = url.searchParams.get("estado");

  const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : "createdAt";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { marca: { contains: search, mode: "insensitive" } },
      { modelo: { contains: search, mode: "insensitive" } },
      { patente: { contains: search, mode: "insensitive" } },
    ];
  }

  if (estado) {
    where.estado = estado;
  }

  const [data, total] = await Promise.all([
    prisma.moto.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderByColumn]: sortOrder },
    }),
    prisma.moto.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/motos — create a moto
export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.create,
    "create",
    ["OPERADOR"] // fallback: OPERADOR keeps working during migration
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = motoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const exists = await prisma.moto.findUnique({
      where: { patente: parsed.data.patente },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Ya existe una moto con esa patente" },
        { status: 409 }
      );
    }

    const moto = await withEvent(
      {
        operationId: OPERATIONS.fleet.moto.create,
        entityType: "Moto",
        getEntityId: (m) => m.id,
        getPayload: (m) => ({
          marca: m.marca,
          modelo: m.modelo,
          patente: m.patente,
          anio: m.anio,
          estado: m.estado,
        }),
        userId,
      },
      () => prisma.moto.create({ data: parsed.data })
    );

    return NextResponse.json(moto, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating moto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
