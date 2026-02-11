import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
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
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER", "OPERADOR"]);
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
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER"]);
  if (error) return error;

  try {
    const { id } = await params;
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

    return NextResponse.json(ausencia);
  } catch (err: unknown) {
    console.error("Error updating ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER"]);
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.ausencia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting ausencia:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
