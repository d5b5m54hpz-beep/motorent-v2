import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ordenCompraSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.purchase_order.view,
    "view",
    ["OPERADOR", "CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const estado = url.searchParams.get("estado");
    const proveedorId = url.searchParams.get("proveedorId");
    const search = url.searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (estado) {
      where.estado = estado;
    }

    if (proveedorId) {
      where.proveedorId = proveedorId;
    }

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        { proveedor: { nombre: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.ordenCompra.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          items: {
            include: {
              repuesto: { select: { id: true, nombre: true, codigo: true } },
            },
          },
          recepciones: { select: { id: true, numero: true, fechaRecepcion: true } },
        },
      }),
      prisma.ordenCompra.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching ordenes de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.purchase_order.create,
    "create",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = ordenCompraSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { proveedorId, items, notas, fechaEntregaEstimada } = parsed.data;

    const lastOC = await prisma.ordenCompra.findFirst({
      orderBy: { createdAt: "desc" },
      select: { numero: true },
    });

    const lastNumber = lastOC ? parseInt(lastOC.numero.split("-")[1] || "0") : 0;
    const numero = `OC-${String(lastNumber + 1).padStart(3, "0")}`;

    const subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.precioUnitario,
      0
    );
    const iva = subtotal * 0.21;
    const total = subtotal + iva;

    const ordenCompra = await prisma.$transaction(async (tx) => {
      const oc = await tx.ordenCompra.create({
        data: {
          numero,
          proveedorId,
          estado: "BORRADOR",
          fechaEntregaEstimada: fechaEntregaEstimada
            ? new Date(fechaEntregaEstimada)
            : undefined,
          subtotal,
          iva,
          total,
          notas,
          creadoPor: userId || undefined,
        },
      });

      for (const item of items) {
        const subtotalItem = item.cantidad * item.precioUnitario;
        await tx.itemOrdenCompra.create({
          data: {
            ordenCompraId: oc.id,
            repuestoId: item.repuestoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: subtotalItem,
          },
        });
      }

      return tx.ordenCompra.findUnique({
        where: { id: oc.id },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          items: {
            include: {
              repuesto: { select: { id: true, nombre: true, codigo: true } },
            },
          },
        },
      });
    });

    // Emit purchase order creation event
    eventBus.emit(
      OPERATIONS.inventory.purchase_order.create,
      "OrdenCompra",
      ordenCompra?.id || "unknown",
      { proveedorId, items: items.length, montoTotal: total },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.purchase_order.create event:", err);
    });

    return NextResponse.json(ordenCompra, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating orden de compra:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
