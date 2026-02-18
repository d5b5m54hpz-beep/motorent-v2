import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { facturaSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.invoice.sale.view,
    "view",
    ["ADMIN", "OPERADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        pago: {
          include: {
            contrato: {
              include: {
                cliente: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                moto: true,
              },
            },
          },
        },
      },
    });

    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(factura);
  } catch (error: unknown) {
    console.error("Error fetching factura:", error);
    return NextResponse.json(
      { error: "Error al obtener factura" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.invoice.sale.update,
    "execute",
    ["ADMIN"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const validated = facturaSchema.parse(body);

    const factura = await prisma.factura.findUnique({ where: { id } });
    if (!factura) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    // Recalcular montos si cambia el tipo
    let updateData: any = {
      tipo: validated.tipo,
      puntoVenta: validated.puntoVenta,
      cae: validated.cae,
      caeVencimiento: validated.caeVencimiento,
      razonSocial: validated.razonSocial,
      cuit: validated.cuit,
    };

    // Si cambia de tipo B/C a A o viceversa, recalcular montos
    if (validated.tipo !== factura.tipo) {
      if (validated.tipo === "A") {
        // Discriminar IVA
        updateData.montoNeto = Number(factura.montoTotal) / 1.21;
        updateData.montoIva = Number(factura.montoTotal) - updateData.montoNeto;
      } else {
        // Tipo B o C - IVA incluido
        updateData.montoNeto = Number(factura.montoTotal);
        updateData.montoIva = 0;
      }
    }

    const updated = await prisma.factura.update({
      where: { id },
      data: updateData,
      include: {
        pago: {
          include: {
            contrato: {
              include: {
                cliente: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                moto: true,
              },
            },
          },
        },
      },
    });

    // Emit event for invoice update
    eventBus.emit(
      OPERATIONS.invoice.sale.update,
      "Factura",
      id,
      {
        previousTipo: factura.tipo,
        newTipo: validated.tipo,
        numero: updated.numero,
        montoTotal: updated.montoTotal,
      },
      userId
    ).catch((err) => {
      console.error("Error emitting invoice.sale.update event:", err);
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }
    console.error("Error updating factura:", error);
    return NextResponse.json(
      { error: "Error al actualizar factura" },
      { status: 500 }
    );
  }
}
