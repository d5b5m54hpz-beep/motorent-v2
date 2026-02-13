import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    // Verify repuesto exists
    const repuesto = await prisma.repuesto.findUnique({
      where: { id },
      select: { id: true, nombre: true, categoria: true },
    });

    if (!repuesto) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    const [data, total] = await Promise.all([
      prisma.historialCostoRepuesto.findMany({
        where: { repuestoId: id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.historialCostoRepuesto.count({
        where: { repuestoId: id },
      }),
    ]);

    return NextResponse.json({
      repuesto,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching historial costos:", err);
    return NextResponse.json(
      { error: "Error al cargar historial de costos" },
      { status: 500 }
    );
  }
}
