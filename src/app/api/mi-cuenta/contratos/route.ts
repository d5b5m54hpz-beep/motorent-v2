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

    // Build where clause
    const where: Record<string, unknown> = {
      clienteId: cliente.id, // Only user's contracts
    };

    if (estado) {
      where.estado = estado;
    }

    // Fetch contracts with moto and pagos
    const [data, total] = await Promise.all([
      prisma.contrato.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          moto: {
            select: {
              id: true,
              marca: true,
              modelo: true,
              patente: true,
              imagen: true,
              precioMensual: true,
              tipo: true,
            },
          },
          pagos: {
            select: {
              id: true,
              estado: true,
              monto: true,
              vencimientoAt: true,
              pagadoAt: true,
            },
            orderBy: { vencimientoAt: "asc" },
          },
        },
      }),
      prisma.contrato.count({ where }),
    ]);

    // Calculate payment progress for each contract
    const contratos = data.map((contrato) => {
      const totalPagos = contrato.pagos.length;
      const pagosPagados = contrato.pagos.filter(
        (p) => p.estado === "aprobado"
      ).length;

      return {
        ...contrato,
        _stats: {
          totalPagos,
          pagosPagados,
          progreso: totalPagos > 0 ? (pagosPagados / totalPagos) * 100 : 0,
        },
      };
    });

    return NextResponse.json({
      data: contratos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching client contracts:", error);
    return NextResponse.json(
      { error: "Error al cargar contratos" },
      { status: 500 }
    );
  }
}
