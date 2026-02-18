import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { withEvent, OPERATIONS } from "@/lib/events";
import { z } from "zod";
import { TipoDocumentoMoto } from "@prisma/client";

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
  const { error } = await requirePermission(
    OPERATIONS.fleet.moto.view,
    "view",
    ["OPERADOR"]
  );
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
  const { error, userId } = await requirePermission(
    OPERATIONS.fleet.moto.upload_document,
    "execute",
    ["OPERADOR"]
  );
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

    const documento = await withEvent(
      {
        operationId: OPERATIONS.fleet.moto.upload_document,
        entityType: "Moto",
        getEntityId: () => id,
        getPayload: (doc) => ({ documentoId: doc.id, tipo: doc.tipo, nombre: doc.nombre }),
        userId,
      },
      () =>
        prisma.documentoMoto.create({
          data: {
            motoId: id,
            tipo: data.tipo as TipoDocumentoMoto,
            nombre: data.nombre,
            url: data.url,
            fechaEmision: data.fechaEmision ? new Date(data.fechaEmision) : null,
            fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
            completado: data.completado,
          },
        })
    );

    return NextResponse.json({ data: documento }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating documento:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
