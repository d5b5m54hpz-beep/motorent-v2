import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { mantenimientoSchema } from "@/lib/validations";

const ALLOWED_SORT_COLUMNS = [
  "createdAt", "costoTotal", "estado", "tipo", "fechaProgramada", "fechaInicio",
];

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "15");
  const search = url.searchParams.get("search") ?? "";
  const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const estado = url.searchParams.get("estado");
  const tipo = url.searchParams.get("tipo");

  const orderByColumn = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : "createdAt";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { descripcion: { contains: search, mode: "insensitive" } },
      { moto: { patente: { contains: search, mode: "insensitive" } } },
      { moto: { marca: { contains: search, mode: "insensitive" } } },
      { moto: { modelo: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;

  const [data, total] = await Promise.all([
    prisma.mantenimiento.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [orderByColumn]: sortOrder },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    }),
    prisma.mantenimiento.count({ where }),
  ]);

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = mantenimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { costoRepuestos, costoManoObra, fechaProgramada, fechaInicio, fechaFin, proximoServiceFecha, proveedorId, ...rest } = parsed.data;
    const costoTotal = costoRepuestos + costoManoObra;

    const moto = await prisma.moto.findUnique({ where: { id: rest.motoId } });
    if (!moto) {
      return NextResponse.json({ error: "Moto no encontrada" }, { status: 404 });
    }

    const mantenimiento = await prisma.mantenimiento.create({
      data: {
        ...rest,
        costoRepuestos,
        costoManoObra,
        costoTotal,
        proveedorId: proveedorId || null,
        fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        proximoServiceFecha: proximoServiceFecha ? new Date(proximoServiceFecha) : null,
      },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    // If EN_PROCESO, update moto status
    if (parsed.data.estado === "EN_PROCESO") {
      await prisma.moto.update({
        where: { id: rest.motoId },
        data: { estado: "mantenimiento" },
      });
    }

    return NextResponse.json(mantenimiento, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating mantenimiento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
