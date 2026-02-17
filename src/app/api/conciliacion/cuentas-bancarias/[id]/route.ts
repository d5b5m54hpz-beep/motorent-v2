import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

const TIPOS_CUENTA_VALIDOS = ["CC_PESOS", "CA_PESOS", "CC_USD", "CA_USD"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePermission(
    OPERATIONS.reconciliation.bank_account.view,
    "view",
    ["CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const cuenta = await prisma.cuentaBancaria.findUnique({
      where: { id },
      include: {
        cuentaContable: {
          select: { codigo: true, nombre: true },
        },
      },
    });

    if (!cuenta) {
      return NextResponse.json(
        { error: "Cuenta bancaria no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(cuenta);
  } catch (err: unknown) {
    console.error("Error fetching cuenta bancaria:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.bank_account.update,
    "execute",
    ["CONTADOR"]
  );
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.cuentaBancaria.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Cuenta bancaria no encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { banco, tipoCuenta, cbu, alias, moneda, activa, cuentaContableId } =
      body;

    if (tipoCuenta && !TIPOS_CUENTA_VALIDOS.includes(tipoCuenta)) {
      return NextResponse.json(
        {
          error: `tipoCuenta inválido. Valores permitidos: ${TIPOS_CUENTA_VALIDOS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (banco !== undefined) updateData.banco = banco;
    if (tipoCuenta !== undefined) updateData.tipoCuenta = tipoCuenta;
    if (cbu !== undefined) updateData.cbu = cbu || null;
    if (alias !== undefined) updateData.alias = alias || null;
    if (moneda !== undefined) updateData.moneda = moneda;
    if (activa !== undefined) updateData.activa = activa;
    if (cuentaContableId !== undefined)
      updateData.cuentaContableId = cuentaContableId || null;

    const cuenta = await prisma.cuentaBancaria.update({
      where: { id },
      data: updateData,
      include: {
        cuentaContable: {
          select: { codigo: true, nombre: true },
        },
      },
    });

    eventBus
      .emit(
        OPERATIONS.reconciliation.bank_account.update,
        "CuentaBancaria",
        id,
        { ...updateData },
        userId
      )
      .catch((err) =>
        console.error(
          "Error emitting reconciliation.bank_account.update event:",
          err
        )
      );

    return NextResponse.json(cuenta);
  } catch (error: unknown) {
    console.error("Error updating cuenta bancaria:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
