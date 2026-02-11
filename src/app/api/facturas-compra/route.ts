import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { facturaCompraSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "fecha";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const estado = url.searchParams.get("estado");
    const proveedorId = url.searchParams.get("proveedorId");
    const tipo = url.searchParams.get("tipo");

    const allowedSorts = ["fecha", "vencimiento", "total", "razonSocial", "numero"];
    const orderByColumn = allowedSorts.includes(sortBy) ? sortBy : "fecha";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: "insensitive" } },
        { numero: { contains: search, mode: "insensitive" } },
        { cuit: { contains: search, mode: "insensitive" } },
      ];
    }

    if (estado) where.estado = estado;
    if (proveedorId) where.proveedorId = proveedorId;
    if (tipo) where.tipo = tipo;

    const [data, total] = await Promise.all([
      prisma.facturaCompra.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        },
      }),
      prisma.facturaCompra.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching facturas compra:", err);
    return NextResponse.json({ data: [], total: 0, page: 1, limit: 15, totalPages: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = facturaCompraSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fecha, vencimiento, motoId, proveedorId, ...rest } = parsed.data;

    // Calculate total
    const total =
      rest.subtotal +
      rest.iva21 +
      rest.iva105 +
      rest.iva27 +
      rest.percepcionIVA +
      rest.percepcionIIBB +
      rest.impInterno +
      rest.noGravado +
      rest.exento;

    const facturaCompra = await prisma.facturaCompra.create({
      data: {
        ...rest,
        total,
        fecha: new Date(fecha),
        vencimiento: vencimiento ? new Date(vencimiento) : null,
        motoId: motoId || null,
        proveedorId: proveedorId || null,
      },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      },
    });

    return NextResponse.json(facturaCompra, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
