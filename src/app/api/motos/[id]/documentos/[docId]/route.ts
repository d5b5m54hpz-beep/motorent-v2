import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { z } from "zod";

const updateDocumentoSchema = z.object({
  nombre: z.string().optional(),
  url: z.string().optional(),
  fechaEmision: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  completado: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { docId } = await context.params;
    const body = await req.json();

    const validation = updateDocumentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const updateData: any = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.fechaEmision !== undefined)
      updateData.fechaEmision = data.fechaEmision ? new Date(data.fechaEmision) : null;
    if (data.fechaVencimiento !== undefined)
      updateData.fechaVencimiento = data.fechaVencimiento
        ? new Date(data.fechaVencimiento)
        : null;
    if (data.completado !== undefined) updateData.completado = data.completado;

    const documento = await prisma.documentoMoto.update({
      where: { id: docId },
      data: updateData,
    });

    return NextResponse.json({ data: documento });
  } catch (err: unknown) {
    console.error("Error updating documento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { docId } = await context.params;

    await prisma.documentoMoto.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting documento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
