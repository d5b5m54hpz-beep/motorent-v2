import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error, userId } = await requireRole(["CLIENTE", "ADMIN"]);
  if (error) return error;

  try {
    // Get cliente from userId
    const cliente = await prisma.cliente.findUnique({
      where: { userId },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const estado = url.searchParams.get("estado");

    // Build where clause - filter pagos by user's contracts
    const where: Record<string, unknown> = {
      contrato: {
        clienteId: cliente.id, // Only user's payments
      },
    };

    if (estado) {
      where.estado = estado;
    }

    // Fetch payments with contract and moto info
    const [data, total] = await Promise.all([
      prisma.pago.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { vencimientoAt: "desc" },
        include: {
          contrato: {
            select: {
              id: true,
              fechaInicio: true,
              fechaFin: true,
              estado: true,
              moto: {
                select: {
                  marca: true,
                  modelo: true,
                  patente: true,
                  imagen: true,
                },
              },
            },
          },
        },
      }),
      prisma.pago.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching client payments:", error);
    return NextResponse.json(
      { error: "Error al cargar pagos" },
      { status: 500 }
    );
  }
}
