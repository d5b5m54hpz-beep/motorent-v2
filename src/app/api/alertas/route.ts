import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { Prisma, TipoAlerta } from "@prisma/client";
import { z } from "zod";

const tipoAlertaValues = Object.values(TipoAlerta) as [TipoAlerta, ...TipoAlerta[]];

const createAlertaSchema = z.object({
  tipo: z.enum(tipoAlertaValues),
  mensaje: z.string().min(1, "Mensaje es requerido"),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/alertas
 * Lista de alertas con paginacion y filtros
 */
export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.alert.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const tipo = searchParams.get("tipo") || "";
    const leida = searchParams.get("leida"); // "true", "false", or null (all)

    const skip = (page - 1) * limit;

    // Construir where clause
    const where: Prisma.AlertaWhereInput = {};

    if (tipo && tipo !== "todos") {
      where.tipo = tipo as TipoAlerta;
    }

    if (leida === "true") {
      where.leida = true;
    } else if (leida === "false") {
      where.leida = false;
    }

    const [alertas, total] = await Promise.all([
      prisma.alerta.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ leida: "asc" }, { createdAt: "desc" }],
      }),
      prisma.alerta.count({ where }),
    ]);

    return NextResponse.json({
      data: alertas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/alertas:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/alertas
 * Crear una nueva alerta manualmente
 */
export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.alert.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = createAlertaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos invalidos", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tipo, mensaje, metadata } = parsed.data;

    const alerta = await prisma.alerta.create({
      data: {
        tipo,
        mensaje,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        leida: false,
      },
    });

    eventBus.emit(OPERATIONS.alert.create, "Alerta", alerta.id, { tipo, mensaje }, userId).catch(err => console.error("[Events] alert.create error:", err));

    return NextResponse.json(alerta, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/alertas:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
