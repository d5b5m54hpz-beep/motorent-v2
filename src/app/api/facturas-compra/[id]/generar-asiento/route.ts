import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Mapeo de categorías de gasto a códigos de cuenta contable
const CATEGORIA_TO_CUENTA: Record<string, string> = {
  MANTENIMIENTO: "5.1.01",
  REPUESTOS: "5.1.02",
  COMBUSTIBLE: "5.1.03",
  SEGURO: "5.2.01",
  SUELDOS: "5.3.01",
  IMPUESTOS: "5.4.01",
  ALQUILER: "5.5.01",
  SERVICIOS: "5.5.02",
  MARKETING: "5.6.01",
  OTRO: "5.7.01",
};

const IVA_CREDITO_FISCAL_CODIGO = "1.1.04"; // IVA Crédito Fiscal (Activo Corriente)
const PROVEEDORES_CODIGO = "2.1.01"; // Proveedores (Pasivo Corriente)

export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.accounting.entry.create,
    "execute",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await context.params;

  try {
    // Get factura with full data
    const factura = await prisma.facturaCompra.findUnique({
      where: { id },
      include: {
        proveedor: { select: { nombre: true } },
      },
    });

    if (!factura) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }

    // Check if already has asiento
    if (factura.asientoId) {
      return NextResponse.json({ error: "La factura ya tiene un asiento contable asociado" }, { status: 400 });
    }

    // Get cuenta for the expense category
    const codigoCuentaGasto = CATEGORIA_TO_CUENTA[factura.categoria] ?? CATEGORIA_TO_CUENTA["OTRO"];
    const cuentaGasto = await prisma.cuentaContable.findUnique({
      where: { codigo: codigoCuentaGasto },
    });

    if (!cuentaGasto) {
      return NextResponse.json(
        { error: `No se encontró la cuenta contable ${codigoCuentaGasto} para la categoría ${factura.categoria}` },
        { status: 400 }
      );
    }

    // Get IVA Crédito Fiscal account
    const cuentaIVA = await prisma.cuentaContable.findUnique({
      where: { codigo: IVA_CREDITO_FISCAL_CODIGO },
    });

    if (!cuentaIVA) {
      return NextResponse.json(
        { error: `No se encontró la cuenta IVA Crédito Fiscal (${IVA_CREDITO_FISCAL_CODIGO})` },
        { status: 400 }
      );
    }

    // Get Proveedores account
    const cuentaProveedores = await prisma.cuentaContable.findUnique({
      where: { codigo: PROVEEDORES_CODIGO },
    });

    if (!cuentaProveedores) {
      return NextResponse.json(
        { error: `No se encontró la cuenta Proveedores (${PROVEEDORES_CODIGO})` },
        { status: 400 }
      );
    }

    // Calculate amounts
    const subtotal = Number(factura.subtotal);
    const totalIVA = Number(factura.iva21) + Number(factura.iva105) + Number(factura.iva27);
    const total = Number(factura.total);

    // Validate debe = haber
    const totalDebe = subtotal + totalIVA;
    const totalHaber = total;

    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      return NextResponse.json(
        { error: "Error en el cálculo: Debe ≠ Haber. Verificá los montos de la factura." },
        { status: 400 }
      );
    }

    // Create asiento
    const descripcion = `Factura ${factura.tipo} ${factura.numero} - ${factura.razonSocial}`;

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: factura.fecha,
        tipo: "COMPRA",
        descripcion,
        totalDebe,
        totalHaber,
        notas: `Generado automáticamente desde factura ${factura.visibleId}`,
        lineas: {
          create: [
            // DEBE: Gasto
            {
              orden: 1,
              cuentaId: cuentaGasto.id,
              debe: subtotal,
              haber: 0,
              descripcion: `${factura.categoria} - ${factura.razonSocial}`,
            },
            // DEBE: IVA Crédito Fiscal
            {
              orden: 2,
              cuentaId: cuentaIVA.id,
              debe: totalIVA,
              haber: 0,
              descripcion: `IVA Crédito Fiscal (21%: $${Number(factura.iva21)}, 10.5%: $${Number(factura.iva105)}, 27%: $${Number(factura.iva27)})`,
            },
            // HABER: Proveedores
            {
              orden: 3,
              cuentaId: cuentaProveedores.id,
              debe: 0,
              haber: total,
              descripcion: factura.proveedor?.nombre ?? factura.razonSocial,
            },
          ],
        },
      },
      include: {
        lineas: {
          include: {
            cuenta: { select: { codigo: true, nombre: true } },
          },
          orderBy: { orden: "asc" },
        },
      },
    });

    // Link asiento to factura
    await prisma.facturaCompra.update({
      where: { id: factura.id },
      data: { asientoId: asiento.id },
    });

    // Emit event for accounting entry creation
    eventBus.emit(
      OPERATIONS.accounting.entry.create,
      "AsientoContable",
      asiento.id,
      {
        facturaCompraId: factura.id,
        tipo: "COMPRA",
        totalDebe,
        totalHaber,
        descripcion,
      },
      userId
    ).catch((err) => {
      console.error("Error emitting accounting.entry.create event:", err);
    });

    return NextResponse.json({
      message: "Asiento contable generado correctamente",
      asiento,
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("Error generating asiento from factura:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
