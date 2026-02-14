import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const repuestoId = searchParams.get("repuestoId");

  try {
    const where: any = {};
    if (repuestoId) where.repuestoId = repuestoId;

    const [data, total] = await Promise.all([
      prisma.historialCostoRepuesto.findMany({
        where,
        include: { repuesto: { select: { id: true, nombre: true, categoria: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.historialCostoRepuesto.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    console.error("Error fetching historial costos:", err);
    return NextResponse.json({ error: "Error al cargar historial de costos" }, { status: 500 });
  }
}
