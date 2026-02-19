import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

const TIPOS_CUENTA_VALIDOS = ["CC_PESOS", "CA_PESOS", "CC_USD", "CA_USD"];

export async function GET(req: NextRequest) {
  const { error } = await requirePermission(
    OPERATIONS.reconciliation.bank_account.view,
    "view",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "15");
    const activa = url.searchParams.get("activa");

    const where: Record<string, unknown> = {};

    if (activa !== null && activa !== undefined && activa !== "") {
      where.activa = activa === "true";
    }

    const [data, total] = await Promise.all([
      prisma.cuentaBancaria.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          cuentaContable: {
            select: { codigo: true, nombre: true },
          },
        },
      }),
      prisma.cuentaBancaria.count({ where }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    console.error("Error fetching cuentas bancarias:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.bank_account.create,
    "create",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const { banco, tipoCuenta, cbu, alias, moneda, cuentaContableId } = body;

    if (!banco || !tipoCuenta) {
      return NextResponse.json(
        { error: "Los campos banco y tipoCuenta son obligatorios" },
        { status: 400 }
      );
    }

    if (!TIPOS_CUENTA_VALIDOS.includes(tipoCuenta)) {
      return NextResponse.json(
        {
          error: `tipoCuenta inválido. Valores permitidos: ${TIPOS_CUENTA_VALIDOS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        banco,
        tipoCuenta,
        cbu: cbu || null,
        alias: alias || null,
        moneda: moneda || "ARS",
        cuentaContableId: cuentaContableId || null,
      },
      include: {
        cuentaContable: {
          select: { codigo: true, nombre: true },
        },
      },
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.bank_account.create,
        "CuentaBancaria",
        cuenta.id,
        { banco, tipoCuenta, cbu },
        userId
      )
      .catch((err) =>
        console.error(
          "Error emitting reconciliation.bank_account.create event:",
          err
        )
      );

    return NextResponse.json(cuenta, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating cuenta bancaria:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
