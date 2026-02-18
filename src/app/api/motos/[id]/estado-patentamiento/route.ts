import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";
import { z } from "zod";

const estadoPatentamientoSchema = z.object({
  estadoPatentamiento: z.enum(["SIN_PATENTAR", "EN_TRAMITE", "PATENTADA"]),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.update_registration,
    "execute",
    ["OPERADOR"]
  );
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

    // Si se marca como PATENTADA, validar que haya dominio/patente
    if (estadoPatentamiento === "PATENTADA") {
      const moto = await prisma.moto.findUnique({
        where: { id },
        select: { dominio: true, patente: true },
      });

      if (!moto?.dominio && !moto?.patente) {
        return NextResponse.json(
          { error: "Para marcar como PATENTADA debe tener dominio o patente asignado" },
          { status: 400 }
        );
      }
    }

    const moto = await withEvent(
      {
        operationId: OPERATIONS.fleet.moto.update_registration,
        entityType: "Moto",
        getEntityId: (m) => m.id,
        getPayload: (m) => ({
          estadoPatentamiento: m.estadoPatentamiento,
          patente: m.patente,
        }),
        userId,
      },
      () => prisma.moto.update({
        where: { id },
        data: {
          estadoPatentamiento,
          fechaPatentamiento:
            estadoPatentamiento === "PATENTADA" ? new Date() : undefined,
        },
        include: {
          documentos: true,
        },
      })
    );

    return NextResponse.json({ data: moto });
  } catch (err: unknown) {
    console.error("Error updating estado patentamiento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
