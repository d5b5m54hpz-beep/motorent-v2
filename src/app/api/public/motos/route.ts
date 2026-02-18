import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_SORT_COLUMNS = ["precioMensual", "anio", "cilindrada", "createdAt"];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "12");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const tipo = url.searchParams.get("tipo");

    // Validate sort column to prevent injection
    const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy)
      ? sortBy
      : "createdAt";

    // Build where clause
    const where: Record<string, unknown> = {
      estado: "DISPONIBLE", // Only show available bikes
    };

    // Filter by tipo if provided
    if (tipo && tipo !== "all") {
      where.tipo = tipo;
    }

    // Search across marca, modelo, patente
    if (search) {
      where.OR = [
        { marca: { contains: search, mode: "insensitive" } },
        { modelo: { contains: search, mode: "insensitive" } },
        { patente: { contains: search, mode: "insensitive" } },
      ];
    }

    // Fetch motos and total count
    const [data, total] = await Promise.all([
      prisma.moto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        select: {
          id: true,
          marca: true,
          modelo: true,
          anio: true,
          color: true,
          precioMensual: true,
          cilindrada: true,
          tipo: true,
          descripcion: true,
          imagen: true,
          kilometraje: true,
          estado: true,
        },
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
  } catch (error: unknown) {
    console.error("Error fetching public motos:", error);
    return NextResponse.json(
      { error: "Error al cargar motos" },
      { status: 500 }
    );
  }
}
