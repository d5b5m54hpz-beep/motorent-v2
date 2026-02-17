import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(OPERATIONS.import_shipment.dispatch.view, "view", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const despachos = await prisma.despachoAduanero.findMany({
      where: { embarqueId: id },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json(despachos);
  } catch (err: unknown) {
    console.error("Error fetching despachos:", err);
    return NextResponse.json(
      { error: "Error al cargar despachos" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.import_shipment.dispatch.create, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      numeroDespacho,
      fecha,
      tipoCambio,
      cifParcialUsd,
      derechosPagados = 0,
      tasaEstadistica = 0,
      ivaPagado = 0,
      ivaAdicionalPagado = 0,
      gananciasPagado = 0,
      iibbPagado = 0,
      gastosDespachante,
      otrosGastos,
      notas,
    } = body;

    if (!numeroDespacho || !fecha || !tipoCambio || !cifParcialUsd) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: numeroDespacho, fecha, tipoCambio, cifParcialUsd" },
        { status: 400 }
      );
    }

    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    const despacho = await prisma.despachoAduanero.create({
      data: {
        embarqueId: id,
        numeroDespacho,
        fecha: new Date(fecha),
        tipoCambio,
        cifParcialUsd,
        derechosPagados,
        tasaEstadistica,
        ivaPagado,
        ivaAdicionalPagado,
        gananciasPagado,
        iibbPagado,
        gastosDespachante,
        otrosGastos,
        notas,
      },
    });

    eventBus.emit(
      OPERATIONS.import_shipment.dispatch.create,
      "Embarque",
      id,
      { despachante: gastosDespachante, aranceles: derechosPagados, ivaImportacion: ivaPagado, numeroDespacho },
      userId
    ).catch(err => console.error("Error emitting import_shipment.dispatch.create event:", err));

    return NextResponse.json({
      success: true,
      message: "Despacho registrado exitosamente",
      despacho,
    });
  } catch (err: unknown) {
    console.error("Error creating despacho:", err);
    return NextResponse.json(
      { error: "Error al registrar despacho" },
      { status: 500 }
    );
  }
}
