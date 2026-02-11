import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { facturaCompraSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    const facturaCompra = await prisma.facturaCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        moto: true,
        gasto: true,
        asiento: { include: { lineas: { include: { cuenta: true } } } },
      },
    });

    if (!facturaCompra) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    return NextResponse.json(facturaCompra);
  } catch (err: unknown) {
    console.error("Error fetching factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  const { id } = await context.params;

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

    const facturaCompra = await prisma.facturaCompra.update({
      where: { id },
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

    return NextResponse.json(facturaCompra);
  } catch (err: unknown) {
    console.error("Error updating factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const { id } = await context.params;

  try {
    // Check if has related gasto or asiento
    const factura = await prisma.facturaCompra.findUnique({
      where: { id },
      select: { gastoId: true, asientoId: true },
    });

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    if (factura.gastoId || factura.asientoId) {
      return NextResponse.json(
        { error: "No se puede eliminar: tiene gasto o asiento contable asociado" },
        { status: 400 }
      );
    }

    await prisma.facturaCompra.delete({ where: { id } });

    return NextResponse.json({ message: "Factura eliminada correctamente" });
  } catch (err: unknown) {
    console.error("Error deleting factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
