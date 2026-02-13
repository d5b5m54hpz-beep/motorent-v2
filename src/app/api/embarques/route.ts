import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const estado = searchParams.get("estado");
  const proveedorId = searchParams.get("proveedorId");
  const search = searchParams.get("search");

  try {
    const where: any = {};
    if (estado) where.estado = estado;
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
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      proveedorId,
      metodoFlete,
      fechaSalida,
      fechaLlegadaEstimada,
      numeroContenedor,
      tipoContenedor,
      items,
      notas,
    } = body;

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

    // Calculate FOB total
    let totalFobUsd = 0;
    const itemsData = items.map((item: any) => {
      const subtotal = item.cantidad * item.precioFobUnitarioUsd;
      totalFobUsd += subtotal;
      return {
        repuestoId: item.repuestoId,
        cantidad: item.cantidad,
        precioFobUnitarioUsd: item.precioFobUnitarioUsd,
        subtotalFobUsd: subtotal,
        pesoTotalKg: item.pesoTotalKg,
        volumenTotalCbm: item.volumenTotalCbm,
        ncmCodigo: item.ncmCodigo,
        arancelPorcentaje: item.arancelPorcentaje,
      };
    });

    const embarque = await prisma.embarqueImportacion.create({
      data: {
        referencia,
        proveedorId,
        metodoFlete,
        fechaSalida: fechaSalida ? new Date(fechaSalida) : null,
        fechaLlegadaEstimada: fechaLlegadaEstimada ? new Date(fechaLlegadaEstimada) : null,
        numeroContenedor,
        tipoContenedor,
        totalFobUsd,
        notas,
        items: {
          create: itemsData,
        },
      },
      include: {
        proveedor: true,
        items: { include: { repuesto: true } },
      },
    });

    return NextResponse.json(embarque);
  } catch (err: unknown) {
    console.error("Error creating embarque:", err);
    return NextResponse.json(
      { error: "Error al crear embarque" },
      { status: 500 }
    );
  }
}
