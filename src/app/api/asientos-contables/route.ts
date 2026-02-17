import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { z } from "zod";

const lineaAsientoSchema = z.object({
  cuentaId: z.string().min(1, "Cuenta requerida"),
  debe: z.number().min(0).default(0),
  haber: z.number().min(0).default(0),
  descripcion: z.string().optional(),
});

const asientoContableSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  tipo: z.enum(["APERTURA", "COMPRA", "VENTA", "PAGO", "COBRO", "AJUSTE", "CIERRE"]),
  descripcion: z.string().min(1, "Descripción requerida"),
  notas: z.string().optional(),
  lineas: z.array(lineaAsientoSchema).min(2, "Mínimo 2 líneas"),
});

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    const search = url.searchParams.get("search") ?? "";
    const tipo = url.searchParams.get("tipo") ?? "";
    const cerrado = url.searchParams.get("cerrado");
    const sortBy = url.searchParams.get("sortBy") ?? "fecha";
    const sortOrder = (url.searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { descripcion: { contains: search, mode: "insensitive" } },
        { notas: { contains: search, mode: "insensitive" } },
      ];
    }
    if (tipo) {
      where.tipo = tipo;
    }
    if (cerrado === "true") {
      where.cerrado = true;
    } else if (cerrado === "false") {
      where.cerrado = false;
    }

    const orderByColumn = ["fecha", "numero", "tipo", "totalDebe"].includes(sortBy) ? sortBy : "fecha";

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
  const { error } = await requireRole(["ADMIN"]);
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

    const totalDebe = lineas.reduce((sum, l) => sum + l.debe, 0);
    const totalHaber = lineas.reduce((sum, l) => sum + l.haber, 0);

    if (Math.abs(totalDebe - totalHaber) >= 0.01) {
      return NextResponse.json(
        { error: `El asiento no balancea: Debe ($${totalDebe.toFixed(2)}) ≠ Haber ($${totalHaber.toFixed(2)})` },
        { status: 400 }
      );
    }

    const asiento = await prisma.asientoContable.create({
      data: {
        fecha: new Date(fecha),
        tipo,
        descripcion,
        notas,
        totalDebe,
        totalHaber,
        lineas: {
          create: lineas.map((l, i) => ({
            orden: i + 1,
            cuentaId: l.cuentaId,
            debe: l.debe,
            haber: l.haber,
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
