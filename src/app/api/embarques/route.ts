import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { embarqueSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.import_shipment.view, "view", ["OPERADOR", "CONTADOR"]);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const estado = searchParams.get("estado");
  const proveedorId = searchParams.get("proveedorId");
  const search = searchParams.get("search");

  try {
    const where: Prisma.EmbarqueImportacionWhereInput = {};
    if (estado) where.estado = estado as Prisma.EmbarqueImportacionWhereInput["estado"];
    if (proveedorId) where.proveedorId = proveedorId;
    if (search) {
      where.OR = [
        { referencia: { contains: search, mode: "insensitive" } },
        { proveedor: { nombre: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.embarqueImportacion.findMany({
        where,
        include: {
          proveedor: true,
          items: { include: { repuesto: true } },
          despachos: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.embarqueImportacion.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching embarques:", err);
    return NextResponse.json(
      { error: "Error al cargar embarques" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.import_shipment.create, "create", ["OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = embarqueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      proveedorId,
      metodoFlete,
      fechaSalida,
      fechaLlegadaEstimada,
      numeroContenedor,
      tipoContenedor,
      items,
      notas,
    } = parsed.data;

    // Get last referencia number
    const lastEmbarque = await prisma.embarqueImportacion.findFirst({
      orderBy: { referencia: "desc" },
      select: { referencia: true },
    });

    let nextNumber = 1;
    if (lastEmbarque) {
      const match = lastEmbarque.referencia.match(/EMB-(\d+)/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    const referencia = `EMB-${String(nextNumber).padStart(3, "0")}`;

    // Calculate FOB total and prepare items data
    let totalFobUsd = 0;
    const itemsData = items.map((item) => {
      const subtotal = item.cantidad * item.precioFobUnitarioUsd;
      totalFobUsd += subtotal;
      return {
        repuestoId: item.repuestoId || null,
        cantidad: item.cantidad,
        precioFobUnitarioUsd: item.precioFobUnitarioUsd,
        subtotalFobUsd: subtotal,
        pesoTotalKg: item.pesoTotalKg || 0,
        volumenTotalCbm: item.volumenTotalCbm || 0,
        ncmCodigo: item.ncmCodigo || null,
        arancelPorcentaje: item.arancelPorcentaje || null,
      };
    });

    const embarque = await prisma.embarqueImportacion.create({
      data: {
        referencia,
        proveedorId: proveedorId || null,
        metodoFlete,
        fechaSalida: fechaSalida ? new Date(fechaSalida) : null,
        fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : null,
        numeroContenedor: numeroContenedor || null,
        tipoContenedor: tipoContenedor || null,
        totalFobUsd,
        notas: notas || null,
        items: {
          create: itemsData,
        },
      },
      include: {
        proveedor: true,
        items: { include: { repuesto: true } },
      },
    });

    eventBus.emit(
      OPERATIONS.import_shipment.create,
      "Embarque",
      embarque.id,
      { proveedorId, items, totalFobUsd, metodoFlete },
      userId
    ).catch(err => console.error("Error emitting import_shipment.create event:", err));

    return NextResponse.json(embarque);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Error creating embarque:", err);
    return NextResponse.json(
      {
        error: "Error al crear embarque",
        details: err instanceof Error ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
