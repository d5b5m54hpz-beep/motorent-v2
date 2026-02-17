import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ubicacionDepositoSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requirePermission(
    OPERATIONS.inventory.location.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const ubicaciones = await prisma.ubicacionDeposito.findMany({
      orderBy: [{ estante: "asc" }, { fila: "asc" }, { posicion: "asc" }],
    });

    const ubicacionesConRepuestos = await Promise.all(
      ubicaciones.map(async (ub) => {
        const cantidadRepuestos = await prisma.repuesto.count({
          where: { ubicacion: ub.codigo, activo: true },
        });

        return {
          ...ub,
          cantidadRepuestos,
        };
      })
    );

    return NextResponse.json(ubicacionesConRepuestos);
  } catch (error: unknown) {
    console.error("Error fetching ubicaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.location.create,
    "create",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = ubicacionDepositoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { estante, fila, posicion, nombre, notas } = parsed.data;

    const codigo = `${estante}-${fila}-${posicion}`;

    const existing = await prisma.ubicacionDeposito.findUnique({
      where: { codigo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una ubicación con ese código" },
        { status: 400 }
      );
    }

    const ubicacion = await prisma.ubicacionDeposito.create({
      data: {
        codigo,
        estante,
        fila,
        posicion,
        nombre,
        notas,
      },
    });

    // Emit location creation event
    eventBus.emit(
      OPERATIONS.inventory.location.create,
      "UbicacionDeposito",
      ubicacion.id,
      { codigo, estante, fila, posicion, nombre },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.location.create event:", err);
    });

    return NextResponse.json(ubicacion, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating ubicacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
