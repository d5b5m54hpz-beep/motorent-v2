import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { z } from "zod";

const ausenciaSchema = z.object({
  empleadoId: z.string().min(1, "Empleado requerido"),
  tipo: z.enum([
    "VACACIONES",
    "ENFERMEDAD",
    "ACCIDENTE_LABORAL",
    "LICENCIA_MATERNIDAD",
    "LICENCIA_PATERNIDAD",
    "ESTUDIO",
    "MATRIMONIO",
    "FALLECIMIENTO_FAMILIAR",
    "MUDANZA",
    "DONACION_SANGRE",
  ]),
  fechaInicio: z.string().min(1, "Fecha inicio requerida"),
  fechaFin: z.string().min(1, "Fecha fin requerida"),
  dias: z.coerce.number().min(1),
  justificada: z.boolean().default(false),
  certificado: z.string().optional(),
  notas: z.string().optional(),
  estado: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).default("PENDIENTE"),
});

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.hr.absence.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const empleadoId = url.searchParams.get("empleadoId") ?? "";
    const tipo = url.searchParams.get("tipo") ?? "";
    const estado = url.searchParams.get("estado") ?? "";

    const where = {
      ...(search && {
        empleado: {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { apellido: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }),
      ...(empleadoId && { empleadoId }),
      ...(tipo && { tipo: tipo as any }),
      ...(estado && { estado }),
    };

    const [data, total] = await Promise.all([
      prisma.ausencia.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fechaInicio: "desc" },
        include: {
          empleado: {
            select: {
              nombre: true,
              apellido: true,
              dni: true,
            },
          },
        },
      }),
      prisma.ausencia.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching ausencias:", err);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        data: [],
        total: 0,
        page: 1,
        limit: 15,
        totalPages: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.hr.absence.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = ausenciaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { empleadoId, tipo, fechaInicio, fechaFin, dias, justificada, certificado, notas, estado } =
      parsed.data;

    // Verify empleado exists
    const empleado = await prisma.empleado.findUnique({ where: { id: empleadoId } });
    if (!empleado) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    const ausencia = await prisma.ausencia.create({
      data: {
        empleadoId,
        tipo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        dias,
        justificada,
        certificado,
        notas,
        estado,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellido: true,
            dni: true,
          },
        },
      },
    });

    eventBus.emit(OPERATIONS.hr.absence.create, "Ausencia", ausencia.id, { empleadoId, tipo, fechaDesde: fechaInicio, fechaHasta: fechaFin }, userId).catch(err => console.error("[Events] hr.absence.create error:", err));

    return NextResponse.json(ausencia, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
