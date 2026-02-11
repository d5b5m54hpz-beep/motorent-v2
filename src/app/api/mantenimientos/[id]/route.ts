import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { mantenimientoSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  const mantenimiento = await prisma.mantenimiento.findUnique({
    where: { id },
    include: {
      moto: { select: { id: true, marca: true, modelo: true, patente: true } },
      proveedor: { select: { id: true, nombre: true } },
      repuestos: {
        include: {
          repuesto: { select: { id: true, nombre: true, codigo: true } },
        },
      },
    },
  });

  if (!mantenimiento) {
    return NextResponse.json(
      { error: "Mantenimiento no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(mantenimiento);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = mantenimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.mantenimiento.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Mantenimiento no encontrado" },
        { status: 404 }
      );
    }

    const {
      costoRepuestos,
      costoManoObra,
      fechaProgramada,
      fechaInicio,
      fechaFin,
      proximoServiceFecha,
      proveedorId,
      ...rest
    } = parsed.data;
    const costoTotal = costoRepuestos + costoManoObra;

    const mantenimiento = await prisma.mantenimiento.update({
      where: { id },
      data: {
        ...rest,
        costoRepuestos,
        costoManoObra,
        costoTotal,
        proveedorId: proveedorId || null,
        fechaProgramada: fechaProgramada ? new Date(fechaProgramada) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        proximoServiceFecha: proximoServiceFecha
          ? new Date(proximoServiceFecha)
          : null,
      },
      include: {
        moto: { select: { id: true, marca: true, modelo: true, patente: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    // Update moto status based on mantenimiento estado
    if (parsed.data.estado === "EN_PROCESO") {
      await prisma.moto.update({
        where: { id: rest.motoId },
        data: { estado: "mantenimiento" },
      });
    } else if (
      parsed.data.estado === "COMPLETADO" ||
      parsed.data.estado === "CANCELADO"
    ) {
      // Check if moto has other active mantenimientos
      const activeCount = await prisma.mantenimiento.count({
        where: {
          motoId: rest.motoId,
          id: { not: id },
          estado: { in: ["EN_PROCESO", "ESPERANDO_REPUESTO"] },
        },
      });
      if (activeCount === 0) {
        await prisma.moto.update({
          where: { id: rest.motoId },
          data: { estado: "disponible" },
        });
      }
    }

    return NextResponse.json(mantenimiento);
  } catch (error: unknown) {
    console.error("Error updating mantenimiento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.mantenimiento.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Mantenimiento no encontrado" },
      { status: 404 }
    );
  }

  await prisma.mantenimiento.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
