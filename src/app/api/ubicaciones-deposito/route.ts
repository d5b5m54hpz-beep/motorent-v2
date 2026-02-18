import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { ubicacionDepositoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.inventory.location.view,
    "view",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [ubicaciones, total] = await Promise.all([
      prisma.ubicacionDeposito.findMany({
        orderBy: [{ estante: "asc" }, { fila: "asc" }, { posicion: "asc" }],
        skip,
        take: limit,
      }),
      prisma.ubicacionDeposito.count(),
    ]);

    // Fix N+1: batch count repuestos per ubicacion using groupBy
    const codigos = ubicaciones.map((ub) => ub.codigo);
    const repuestoCounts = await prisma.repuesto.groupBy({
      by: ["ubicacion"],
      where: { ubicacion: { in: codigos }, activo: true },
      _count: { id: true },
    });

    const countMap = new Map(
      repuestoCounts.map((r) => [r.ubicacion, r._count.id])
    );

    const data = ubicaciones.map((ub) => ({
      ...ub,
      cantidadRepuestos: countMap.get(ub.codigo) || 0,
    }));

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
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
