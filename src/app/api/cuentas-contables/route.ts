import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { cuentaContableSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(OPERATIONS.accounting.account.view, "view", ["CONTADOR", "OPERADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "100"); // Higher default for chart of accounts
    const search = url.searchParams.get("search") ?? "";
    const tipo = url.searchParams.get("tipo") ?? "";
    const nivel = url.searchParams.get("nivel") ?? "";
    const soloImputables = url.searchParams.get("imputable") === "true";
    const sortBy = url.searchParams.get("sortBy") ?? "codigo";
    const sortOrder = (url.searchParams.get("sortOrder") ?? "asc") as "asc" | "desc";

    const where = {
      ...(search && {
        OR: [
          { codigo: { contains: search, mode: "insensitive" as const } },
          { nombre: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(tipo && { tipo: tipo as "ACTIVO" | "PASIVO" | "PATRIMONIO" | "INGRESO" | "EGRESO" }),
      ...(nivel && { nivel: parseInt(nivel) }),
      ...(soloImputables && { imputable: true, activa: true }),
    };

    const orderByColumn = sortBy === "codigo" ? "codigo" : sortBy === "nombre" ? "nombre" : "codigo";

    const [data, total] = await Promise.all([
      prisma.cuentaContable.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderByColumn]: sortOrder },
      }),
      prisma.cuentaContable.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching cuentas contables:", err);
    return NextResponse.json({
      error: "Error interno del servidor",
      data: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(OPERATIONS.accounting.account.create, "create", ["CONTADOR"]);
  if (error) return error;

  try {
    const body = await req.json();
    const parsed = cuentaContableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { codigo, nombre, tipo, padre, nivel, imputable, activa, descripcion } = parsed.data;

    // Check if codigo already exists
    const existing = await prisma.cuentaContable.findUnique({ where: { codigo } });
    if (existing) {
      return NextResponse.json({ error: "El código ya existe" }, { status: 400 });
    }

    // If has padre, verify it exists
    if (padre) {
      const padreCuenta = await prisma.cuentaContable.findUnique({ where: { codigo: padre } });
      if (!padreCuenta) {
        return NextResponse.json({ error: "La cuenta padre no existe" }, { status: 400 });
      }
    }

    const cuenta = await prisma.cuentaContable.create({
      data: {
        codigo,
        nombre,
        tipo,
        padre,
        nivel,
        imputable,
        activa,
        descripcion,
      },
    });

    eventBus.emit(OPERATIONS.accounting.account.create, "CuentaContable", cuenta.id, { codigo, nombre }, userId).catch(err => console.error("[Events] accounting.account.create error:", err));

    return NextResponse.json(cuenta, { status: 201 });
  } catch (err: unknown) {
    console.error("Error creating cuenta contable:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
