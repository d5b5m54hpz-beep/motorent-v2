import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { z } from "zod";

const estadoPatentamientoSchema = z.object({
  estadoPatentamiento: z.enum(["NO_INICIADO", "EN_PROCESO", "OBSERVADO", "COMPLETADO"]),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const validation = estadoPatentamientoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { estadoPatentamiento } = validation.data;

    // Si se marca como COMPLETADO, validar que haya dominio/patente
    if (estadoPatentamiento === "COMPLETADO") {
      const moto = await prisma.moto.findUnique({
        where: { id },
        select: { dominio: true, patente: true },
      });

      if (!moto?.dominio && !moto?.patente) {
        return NextResponse.json(
          { error: "Para marcar como COMPLETADO debe tener dominio o patente asignado" },
          { status: 400 }
        );
      }
    }

    const moto = await prisma.moto.update({
      where: { id },
      data: {
        estadoPatentamiento,
        fechaPatentamiento:
          estadoPatentamiento === "COMPLETADO" ? new Date() : undefined,
      },
      include: {
        documentos: true,
      },
    });

    return NextResponse.json({ data: moto });
  } catch (err: unknown) {
    console.error("Error updating estado patentamiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
