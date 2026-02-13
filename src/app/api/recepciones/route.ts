import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recepcionSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");

    const [data, total] = await Promise.all([
      prisma.recepcionMercaderia.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          ordenCompra: {
            select: {
              id: true,
              numero: true,
              proveedor: { select: { nombre: true } },
            },
          },
          items: {
            include: {
              repuesto: {
                select: { id: true, nombre: true, codigo: true },
              },
            },
          },
        },
      }),
      prisma.recepcionMercaderia.count(),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching recepciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = recepcionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ordenCompraId, items, notas } = parsed.data;

    const lastRec = await prisma.recepcionMercaderia.findFirst({
      orderBy: { createdAt: "desc" },
      select: { numero: true },
    });

    const lastNumber = lastRec
      ? parseInt(lastRec.numero.split("-")[1] || "0")
      : 0;
    const numero = `REC-${String(lastNumber + 1).padStart(3, "0")}`;

    const recepcion = await prisma.$transaction(async (tx) => {
      const rec = await tx.recepcionMercaderia.create({
        data: {
          numero,
          ordenCompraId: ordenCompraId || null,
          fechaRecepcion: new Date(),
          recibidoPor: session.user.email || undefined,
          notas,
        },
      });

      for (const item of items) {
        const repuesto = await tx.repuesto.findUnique({
          where: { id: item.repuestoId },
        });

        if (!repuesto) continue;

        const cantidadRecibida = item.cantidadRecibida || 0;

        await tx.repuesto.update({
          where: { id: item.repuestoId },
          data: {
            stock: { increment: cantidadRecibida },
            ubicacion: item.ubicacionAsignada || repuesto.ubicacion,
          },
        });

        await tx.movimientoStock.create({
          data: {
            repuestoId: item.repuestoId,
            tipo: "ENTRADA_COMPRA",
            cantidad: cantidadRecibida,
            stockAnterior: repuesto.stock,
            stockNuevo: repuesto.stock + cantidadRecibida,
            motivo: ordenCompraId
              ? `Recepción ${numero} de OC`
              : `Recepción ${numero} (ingreso directo)`,
            referencia: ordenCompraId || undefined,
            usuario: session.user.email || undefined,
          },
        });

        await tx.itemRecepcion.create({
          data: {
            recepcionId: rec.id,
            repuestoId: item.repuestoId,
            cantidadEsperada: null,
            cantidadRecibida,
            cantidadRechazada: item.cantidadRechazada || 0,
            ubicacionAsignada: item.ubicacionAsignada,
            observaciones: item.observaciones,
          },
        });

        if (ordenCompraId) {
          const itemOC = await tx.itemOrdenCompra.findFirst({
            where: {
              ordenCompraId,
              repuestoId: item.repuestoId,
            },
          });

          if (itemOC) {
            await tx.itemOrdenCompra.update({
              where: { id: itemOC.id },
              data: {
                cantidadRecibida: {
                  increment: cantidadRecibida,
                },
              },
            });
          }
        }
      }

      if (ordenCompraId) {
        const itemsOC = await tx.itemOrdenCompra.findMany({
          where: { ordenCompraId },
        });

        const todosCompletos = itemsOC.every(
          (item) => item.cantidadRecibida >= item.cantidad
        );
        const algunoRecibido = itemsOC.some((item) => item.cantidadRecibida > 0);

        if (todosCompletos) {
          await tx.ordenCompra.update({
            where: { id: ordenCompraId },
            data: { estado: "COMPLETADA" },
          });
        } else if (algunoRecibido) {
          await tx.ordenCompra.update({
            where: { id: ordenCompraId },
            data: { estado: "PARCIAL" },
          });
        }
      }

      return tx.recepcionMercaderia.findUnique({
        where: { id: rec.id },
        include: {
          ordenCompra: {
            select: {
              id: true,
              numero: true,
              proveedor: { select: { nombre: true } },
            },
          },
          items: {
            include: {
              repuesto: {
                select: { id: true, nombre: true, codigo: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(recepcion, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating recepcion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
