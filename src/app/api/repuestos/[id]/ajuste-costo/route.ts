import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { costoNuevoArs, costoNuevoUsd, motivo, referencia, tipoCambio } = body;

    if (!costoNuevoArs || costoNuevoArs < 0) {
      return NextResponse.json(
        { error: "Costo en ARS es requerido y debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!motivo || motivo.trim() === "") {
      return NextResponse.json(
        { error: "Motivo es requerido" },
        { status: 400 }
      );
    }

    const repuesto = await prisma.repuesto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        costoPromedioArs: true,
        costoPromedioUsd: true,
        stock: true,
      },
    });

    if (!repuesto) {
      return NextResponse.json({ error: "Repuesto no encontrado" }, { status: 404 });
    }

    const costoAnteriorArs = repuesto.costoPromedioArs || 0;
    const costoAnteriorUsd = repuesto.costoPromedioUsd || 0;

    // Update repuesto and create history in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.repuesto.update({
        where: { id },
        data: {
          costoPromedioArs: costoNuevoArs,
          costoPromedioUsd: costoNuevoUsd || 0,
          precioCompra: costoNuevoArs,
          ultimoCostoUpdate: new Date(),
        },
      });

      const historial = await tx.historialCostoRepuesto.create({
        data: {
          repuestoId: id,
          costoAnteriorArs,
          costoNuevoArs,
          costoAnteriorUsd,
          costoNuevoUsd: costoNuevoUsd || 0,
          cantidadAnterior: repuesto.stock,
          cantidadNueva: repuesto.stock, // Stock doesn't change in manual adjustment
          motivo: "AJUSTE_MANUAL",
          referencia: referencia || motivo,
          tipoCambio: tipoCambio || null,
          usuario: session.user?.email || null,
        },
      });

      return { updated, historial };
    });

    const variacionPct =
      costoAnteriorArs > 0
        ? ((costoNuevoArs - costoAnteriorArs) / costoAnteriorArs) * 100
        : 0;

    return NextResponse.json({
      success: true,
      message: "Costo ajustado exitosamente",
      cambio: {
        repuestoId: id,
        nombre: repuesto.nombre,
        costoAnterior: costoAnteriorArs,
        costoNuevo: costoNuevoArs,
        variacion: variacionPct,
        historialId: result.historial.id,
      },
    });
  } catch (err: unknown) {
    console.error("Error adjusting cost:", err);
    return NextResponse.json(
      { error: "Error al ajustar costo" },
      { status: 500 }
    );
  }
}
