import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error, userId } = await requireRole(["CLIENTE", "ADMIN"]);
  if (error) return error;

  try {
    // Get cliente from userId
    let cliente = await prisma.cliente.findUnique({
      where: { userId },
    });

    // If cliente doesn't exist, auto-create it
    if (!cliente) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      cliente = await prisma.cliente.create({
        data: {
          userId,
          nombre: user.name || "",
          email: user.email,
        },
      });

      console.log("✅ Cliente auto-created for pagos GET:", userId);

      // Return empty array since new user has no payments yet
      return NextResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
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
