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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePermission(OPERATIONS.hr.absence.view, "view", ["OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    const ausencia = await prisma.ausencia.findUnique({
      where: { id },
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

    if (!ausencia) {
      return NextResponse.json({ error: "Ausencia no encontrada" }, { status: 404 });
    }

    return NextResponse.json(ausencia);
  } catch (err: unknown) {
    console.error("Error fetching ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Peek at the body to detect if this is an approval action
  const body = await req.json();
  const isApproval = body.estado === "APROBADA" || body.estado === "RECHAZADA";

  const { error, userId } = isApproval
    ? await requirePermission(OPERATIONS.hr.absence.approve, "approve", ["OPERADOR"])
    : await requirePermission(OPERATIONS.hr.absence.update, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    const parsed = ausenciaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { empleadoId, tipo, fechaInicio, fechaFin, dias, justificada, certificado, notas, estado } =
      parsed.data;

    const ausencia = await prisma.ausencia.update({
      where: { id },
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

    if (isApproval) {
      eventBus.emit(OPERATIONS.hr.absence.approve, "Ausencia", id, { estado, empleadoId, tipo }, userId).catch(err => console.error("[Events] hr.absence.approve error:", err));
    } else {
      eventBus.emit(OPERATIONS.hr.absence.update, "Ausencia", id, { empleadoId, tipo, fechaInicio, fechaFin }, userId).catch(err => console.error("[Events] hr.absence.update error:", err));
    }

    return NextResponse.json(ausencia);
  } catch (err: unknown) {
    console.error("Error updating ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requirePermission(OPERATIONS.hr.absence.update, "execute", ["OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.ausencia.delete({ where: { id } });

    eventBus.emit(OPERATIONS.hr.absence.update, "Ausencia", id, { action: "delete" }, userId).catch(err => console.error("[Events] hr.absence.delete error:", err));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
