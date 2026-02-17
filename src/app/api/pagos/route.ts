import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

const ALLOWED_SORT_COLUMNS = [
  "vencimientoAt",
  "pagadoAt",
  "monto",
  "estado",
  "createdAt",
];

// GET /api/pagos — list pagos (paginated, searchable, sortable, filterable)
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.payment.view,
    "view",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "15");
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const estado = url.searchParams.get("estado");

  const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy)
    ? sortBy
    : "createdAt";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { contratoId: { contains: search, mode: "insensitive" } },
      { contrato: { cliente: { nombre: { contains: search, mode: "insensitive" } } } },
      { contrato: { moto: { patente: { contains: search, mode: "insensitive" } } } },
      { contrato: { moto: { marca: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (estado) {
    where.estado = estado;
  }

  const [data, total] = await Promise.all([
    prisma.pago.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderByColumn]: sortOrder },
      include: {
        contrato: {
          include: {
            cliente: {
              include: {
                user: { select: { name: true, email: true } },
              },
            },
            moto: {
              select: { marca: true, modelo: true, patente: true },
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
}
