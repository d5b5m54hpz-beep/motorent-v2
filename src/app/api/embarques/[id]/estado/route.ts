import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { OPERATIONS } from "@/lib/events";

const ESTADOS_VALIDOS = ["BORRADOR", "EN_TRANSITO", "EN_ADUANA", "COSTO_FINALIZADO", "RECIBIDO"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.import_shipment.view, "view", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { estado } = body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    // Validate state transitions
    if (embarque.estado === "COSTO_FINALIZADO" && estado === "BORRADOR") {
      return NextResponse.json(
        { error: "No se puede volver a BORRADOR desde COSTO_FINALIZADO" },
        { status: 400 }
      );
    }

    if (embarque.estado === "RECIBIDO" && estado !== "RECIBIDO") {
      return NextResponse.json(
        { error: "No se puede cambiar el estado de un embarque RECIBIDO" },
        { status: 400 }
      );
    }

    const updated = await prisma.embarqueImportacion.update({
      where: { id },
      data: { estado },
      include: {
        proveedor: true,
        items: { include: { repuesto: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Estado cambiado a ${estado}`,
      embarque: updated,
    });
  } catch (err: unknown) {
    console.error("Error changing estado:", err);
    return NextResponse.json(
      { error: "Error al cambiar estado" },
      { status: 500 }
    );
  }
}
