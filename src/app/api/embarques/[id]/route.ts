import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      include: {
        proveedor: true,
        items: { include: { repuesto: true } },
        despachos: true,
        asignaciones: { include: { repuesto: true } },
      },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    return NextResponse.json(embarque);
  } catch (err: unknown) {
    console.error("Error fetching embarque:", err);
    return NextResponse.json(
      { error: "Error al cargar embarque" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    if (embarque.estado !== "BORRADOR" && embarque.estado !== "EN_TRANSITO") {
      return NextResponse.json(
        { error: "Solo se pueden editar embarques en BORRADOR o EN_TRANSITO" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      fleteUsd,
      seguroUsd,
      fechaSalida,
      fechaLlegadaEstimada,
      fechaLlegadaReal,
      numeroContenedor,
      tipoContenedor,
      notas,
    } = body;

    // Get current embarque data to calculate CIF
    const currentEmbarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { totalFobUsd: true, fleteUsd: true, seguroUsd: true },
    });

    if (!currentEmbarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    // Calculate CIF = FOB + Flete + Seguro
    const newFleteUsd = fleteUsd !== undefined ? fleteUsd : currentEmbarque.fleteUsd;
    const newSeguroUsd = seguroUsd !== undefined ? seguroUsd : currentEmbarque.seguroUsd;
    const cifUsd = currentEmbarque.totalFobUsd + newFleteUsd + newSeguroUsd;

    const updated = await prisma.embarqueImportacion.update({
      where: { id },
      data: {
        fleteUsd: fleteUsd !== undefined ? fleteUsd : undefined,
        seguroUsd: seguroUsd !== undefined ? seguroUsd : undefined,
        cifUsd,
        fechaSalida: fechaSalida ? new Date(fechaSalida) : undefined,
        fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : undefined,
        fechaLlegadaReal: fechaLlegadaReal ? new Date(fechaLlegadaReal) : undefined,
        numeroContenedor,
        tipoContenedor,
        notas,
      },
      include: {
        proveedor: true,
        items: { include: { repuesto: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Error updating embarque:", err);
    return NextResponse.json(
      { error: "Error al actualizar embarque" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    if (embarque.estado !== "BORRADOR" && embarque.estado !== "EN_TRANSITO") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar embarques en BORRADOR o EN_TRANSITO" },
        { status: 400 }
      );
    }

    await prisma.embarqueImportacion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting embarque:", err);
    return NextResponse.json(
      { error: "Error al eliminar embarque" },
      { status: 500 }
    );
  }
}
