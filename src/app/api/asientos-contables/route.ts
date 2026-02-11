import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { asientoContableSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const search = url.searchParams.get("search") ?? "";
    const tipo = url.searchParams.get("tipo") ?? "";
    const sortBy = url.searchParams.get("sortBy") ?? "fecha";
    const sortOrder = (url.searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where = {
      ...(search && {
        OR: [
          { descripcion: { contains: search, mode: "insensitive" as const } },
          { visibleId: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(tipo && { tipo: tipo as "APERTURA" | "COMPRA" | "VENTA" | "PAGO" | "COBRO" | "AJUSTE" | "CIERRE" }),
    };

    const orderByColumn = sortBy === "fecha" ? "fecha" : sortBy === "numero" ? "numero" : "fecha";

    const [data, total] = await Promise.all([
      prisma.asientoContable.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
        include: {
          lineas: {
            include: {
              cuenta: { select: { codigo: true, nombre: true } },
            },
            orderBy: { orden: "asc" },
          },
        },
      }),
      prisma.asientoContable.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching asientos contables:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = asientoContableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fecha, tipo, descripcion, notas, lineas } = parsed.data;

    // Calculate totals
    const totalDebe = lineas.reduce((sum, l) => sum + (l.debe || 0), 0);
    const totalHaber = lineas.reduce((sum, l) => sum + (l.haber || 0), 0);

    // Validate debe = haber
    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      return NextResponse.json(
        { error: "El total del Debe debe ser igual al total del Haber" },
        { status: 400 }
      );
    }

    // Validate all cuentas exist and are imputable
    for (const linea of lineas) {
      const cuenta = await prisma.cuentaContable.findUnique({
        where: { id: linea.cuentaId },
        select: { imputable: true, activa: true },
      });

      if (!cuenta) {
        return NextResponse.json(
          { error: `La cuenta ${linea.cuentaId} no existe` },
          { status: 400 }
        );
      }

      if (!cuenta.imputable) {
        return NextResponse.json(
          { error: `La cuenta no es imputable` },
          { status: 400 }
        );
      }

      if (!cuenta.activa) {
        return NextResponse.json(
          { error: `La cuenta no está activa` },
          { status: 400 }
        );
      }
    }

    // Create asiento with lineas
    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(fecha),
        tipo,
        descripcion,
        totalDebe,
        totalHaber,
        notas,
        lineas: {
          create: lineas.map((l, idx) => ({
            orden: idx + 1,
            cuentaId: l.cuentaId,
            debe: l.debe || 0,
            haber: l.haber || 0,
            descripcion: l.descripcion,
          })),
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

    return NextResponse.json(asiento, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating asiento contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
