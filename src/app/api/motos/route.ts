import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { motoSchema } from "@/lib/validations";

// GET /api/motos — list all motos (paginated)
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");
  const search = url.searchParams.get("search") ?? "";

  const where = search
    ? {
        OR: [
          { marca: { contains: search, mode: "insensitive" as const } },
          { modelo: { contains: search, mode: "insensitive" as const } },
          { patente: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.moto.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.moto.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/motos — create a moto
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const body = await req.json();
  const parsed = motoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check unique patente
  const exists = await prisma.moto.findUnique({
    where: { patente: parsed.data.patente },
  });
  if (exists) {
    return NextResponse.json(
      { error: "Ya existe una moto con esa patente" },
      { status: 409 }
    );
  }

  const moto = await prisma.moto.create({ data: parsed.data });
  return NextResponse.json(moto, { status: 201 });
}
