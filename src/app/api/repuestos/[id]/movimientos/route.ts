import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    const tipo = url.searchParams.get("tipo");

    const where: Record<string, unknown> = { repuestoId: id };

    if (tipo) {
      where.tipo = tipo;
    }

    const [movimientos, total] = await Promise.all([
      prisma.movimientoStock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          repuesto: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
            },
          },
        },
      }),
      prisma.movimientoStock.count({ where }),
    ]);

    return NextResponse.json({
      data: movimientos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching movimientos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
