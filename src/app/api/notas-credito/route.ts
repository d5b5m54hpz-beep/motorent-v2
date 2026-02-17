import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { notaCreditoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.credit_note.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const estado = url.searchParams.get("estado");
    const clienteId = url.searchParams.get("clienteId");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        { motivo: { contains: search, mode: "insensitive" } },
      ];
    }

    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;

    const [data, total] = await Promise.all([
      prisma.notaCredito.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaEmision: "desc" },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      }),
      prisma.notaCredito.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching notas de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.credit_note.create, "create", ["CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = notaCreditoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fechaAplicacion, ...rest } = parsed.data;

    // Generar número autoincremental
    const lastNC = await prisma.notaCredito.findFirst({
      orderBy: { numero: "desc" },
      select: { numero: true },
    });

    let numeroNC = "NC-0001";
    if (lastNC) {
      const lastNum = parseInt(lastNC.numero.split("-")[1]);
      numeroNC = `NC-${String(lastNum + 1).padStart(4, "0")}`;
    }

    const notaCredito = await prisma.notaCredito.create({
      data: {
        ...rest,
        numero: numeroNC,
        fechaAplicacion: fechaAplicacion ? new Date(fechaAplicacion) : null,
        creadoPor: userId || null,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    eventBus.emit(OPERATIONS.credit_note.create, "NotaCredito", notaCredito.id, { facturaOriginalId: rest.facturaOriginalId, monto: rest.monto, motivo: rest.motivo }, userId).catch(err => console.error("[Events] credit_note.create error:", err));

    return NextResponse.json({ data: notaCredito }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating nota de crédito:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
