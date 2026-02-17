import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.invoice.sale.view,
    "view",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "15");
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const tipo = searchParams.get("tipo") || "";
  const emitida = searchParams.get("emitida") || "";

  const skip = (page - 1) * limit;

  try {
    // Build where clause
    const where: any = {};

    // Filtro por tipo
    if (tipo && (tipo === "A" || tipo === "B" || tipo === "C")) {
      where.tipo = tipo;
    }

    // Filtro por emitida
    if (emitida === "true") {
      where.emitida = true;
    } else if (emitida === "false") {
      where.emitida = false;
    }

    // Search por número de factura, nombre cliente, o patente moto
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        {
          pago: {
            contrato: {
              cliente: {
                OR: [
                  { nombre: { contains: search, mode: "insensitive" } },
                  { user: { name: { contains: search, mode: "insensitive" } } },
                  { dni: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        },
        {
          pago: {
            contrato: {
              moto: {
                patente: { contains: search, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    // Validar sortBy
    const allowedSortFields = ["numero", "tipo", "montoTotal", "createdAt", "emitida"];
    const orderBy: any = {};
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          pago: {
            include: {
              contrato: {
                include: {
                  cliente: {
                    include: {
                      user: {
                        select: {
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                  moto: {
                    select: {
                      marca: true,
                      modelo: true,
                      patente: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.factura.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: facturas,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching facturas:", error);
    return NextResponse.json(
      { error: "Error al obtener facturas" },
      { status: 500 }
    );
  }
}
