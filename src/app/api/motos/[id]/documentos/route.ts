import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { z } from "zod";

const documentoSchema = z.object({
  tipo: z.string().min(1),
  nombre: z.string().min(1),
  url: z.string().optional(),
  fechaEmision: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  completado: z.boolean().default(false),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await context.params;

    const documentos = await prisma.documentoMoto.findMany({
      where: { motoId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: documentos });
  } catch (err: unknown) {
    console.error("Error fetching documentos:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const validation = documentoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const documento = await prisma.documentoMoto.create({
      data: {
        motoId: id,
        tipo: data.tipo,
        nombre: data.nombre,
        url: data.url,
        fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : null,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        completado: data.completado,
      },
    });

    return NextResponse.json({ data: documento }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating documento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
