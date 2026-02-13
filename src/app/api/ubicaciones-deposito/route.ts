import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ubicacionDepositoSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

    return NextResponse.json(ubicacion, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating ubicacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
