import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { facturaCompraSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const { error } = await requirePermission(
    OPERATIONS.invoice.purchase.view,
    "view",
    ["ADMIN", "OPERADOR"]
  );
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
  const { error, userId } = await requirePermission(
    OPERATIONS.invoice.purchase.approve,
    "execute",
    ["OPERADOR"] // fallback: OPERADOR keeps working during migration
  );
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

    // Fetch current state to detect status transitions
    const existing = await prisma.facturaCompra.findUnique({
      where: { id },
      select: { estado: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
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

    // Emit event when purchase invoice is approved (state transition)
    if (parsed.data.estado === "APROBADA" && existing.estado !== "APROBADA") {
      eventBus.emit(
        OPERATIONS.invoice.purchase.approve,
        "FacturaCompra",
        id,
        {
          previousEstado: existing.estado,
          newEstado: parsed.data.estado,
          total: facturaCompra.total,
          numero: facturaCompra.numero,
          razonSocial: facturaCompra.razonSocial,
          proveedorId: facturaCompra.proveedor?.id ?? null,
        },
        userId
      ).catch((err) => {
        console.error("Error emitting invoice.purchase.approve event:", err);
      });
    }

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
  const { error, userId } = await requirePermission(
    OPERATIONS.invoice.purchase.cancel,
    "execute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    // Check if has related gasto or asiento
    const factura = await prisma.facturaCompra.findUnique({
      where: { id },
      select: { gastoId: true, asientoId: true, numero: true, razonSocial: true, total: true },
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

    // Emit event for purchase invoice deletion
    eventBus.emit(
      OPERATIONS.invoice.purchase.cancel,
      "FacturaCompra",
      id,
      {
        numero: factura.numero,
        razonSocial: factura.razonSocial,
        total: factura.total,
      },
      userId
    ).catch((err) => {
      console.error("Error emitting invoice.purchase.cancel event:", err);
    });

    return NextResponse.json({ message: "Factura eliminada correctamente" });
  } catch (err: unknown) {
    console.error("Error deleting factura compra:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
