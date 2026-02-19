import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { createHash } from "crypto";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.reconciliation.statement.import,
    "execute",
    ["CONTADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const { cuentaBancariaId, movimientos } = body;

    if (!cuentaBancariaId || !Array.isArray(movimientos)) {
      return NextResponse.json(
        {
          error:
            "Se requiere cuentaBancariaId y un array de movimientos",
        },
        { status: 400 }
      );
    }

    // Verify the bank account exists
    const cuenta = await prisma.cuentaBancaria.findUnique({
      where: { id: cuentaBancariaId },
    });

    if (!cuenta) {
      return NextResponse.json(
        { error: "Cuenta bancaria no encontrada" },
        { status: 404 }
      );
    }

    let importados = 0;
    let duplicadosIgnorados = 0;

    for (const mov of movimientos) {
      const { fecha, descripcion, referencia, monto, tipo, saldo } = mov;

      if (!fecha || !descripcion || monto === undefined || !tipo) {
        continue;
      }

      if (tipo !== "CREDITO" && tipo !== "DEBITO") {
        continue;
      }

      const hash = createHash("sha256")
        .update(`${fecha}|${monto}|${descripcion}`)
        .digest("hex");

      try {
        await prisma.extractoBancario.create({
          data: {
            cuentaBancariaId,
            fecha: new Date(fecha),
            descripcion,
            referencia: referencia || null,
            monto: new Decimal(monto),
            tipo,
            saldo: saldo !== undefined && saldo !== null ? new Decimal(saldo) : null,
            hash,
          },
        });
        importados++;
      } catch (err: unknown) {
        // If unique constraint on hash fails, it's a duplicate
        if (
          err instanceof Error &&
          err.message.includes("Unique constraint")
        ) {
          duplicadosIgnorados++;
        } else {
          throw err;
        }
      }
    }

    eventBus
      .emit(
        OPERATIONS.reconciliation.statement.import,
        "ExtractoBancario",
        cuentaBancariaId,
        {
          cuentaBancariaId,
          cantidadMovimientos: importados,
          duplicadosIgnorados,
        },
        userId
      )
      .catch((err) =>
        console.error(
          "Error emitting reconciliation.statement.import event:",
          err
        )
      );

    return NextResponse.json({
      importados,
      duplicadosIgnorados,
      total: movimientos.length,
    });
  } catch (error: unknown) {
    console.error("Error importing extracto bancario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
