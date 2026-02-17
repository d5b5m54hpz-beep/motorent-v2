import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { importRepuestoSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const { error, userId } = await requirePermission(
    OPERATIONS.inventory.part.import_bulk,
    "execute",
    ["OPERADOR"]
  );
  if (error) return error;

  try {
    const body = await req.json();
    const { repuestos } = body;

    if (!Array.isArray(repuestos) || repuestos.length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar un array de repuestos" },
        { status: 400 }
      );
    }

    let creados = 0;
    let actualizados = 0;
    const errores: Array<{ fila: number; error: string }> = [];

    for (let i = 0; i < repuestos.length; i++) {
      const fila = i + 1;
      const parsed = importRepuestoSchema.safeParse(repuestos[i]);

      if (!parsed.success) {
        errores.push({
          fila,
          error: JSON.stringify(parsed.error.flatten().fieldErrors),
        });
        continue;
      }

      try {
        const { codigo, stock, ...data } = parsed.data;
        const stockValue = stock ?? 0;

        if (codigo) {
          const existing = await prisma.repuesto.findFirst({
            where: { codigo },
          });

          if (existing) {
            await prisma.$transaction(async (tx) => {
              await tx.repuesto.update({
                where: { id: existing.id },
                data: { ...data, codigo },
              });

              if (stockValue !== existing.stock) {
                const diff = stockValue - existing.stock;
                await tx.movimientoStock.create({
                  data: {
                    repuestoId: existing.id,
                    tipo: "IMPORTACION",
                    cantidad: diff,
                    stockAnterior: existing.stock,
                    stockNuevo: stockValue,
                    motivo: "Importación CSV",
                    usuario: userId || undefined,
                  },
                });

                await tx.repuesto.update({
                  where: { id: existing.id },
                  data: { stock: stockValue },
                });
              }
            });

            actualizados++;
          } else {
            await prisma.$transaction(async (tx) => {
              const newRepuesto = await tx.repuesto.create({
                data: { ...data, codigo, stock: stockValue },
              });

              if (stockValue > 0) {
                await tx.movimientoStock.create({
                  data: {
                    repuestoId: newRepuesto.id,
                    tipo: "IMPORTACION",
                    cantidad: stockValue,
                    stockAnterior: 0,
                    stockNuevo: stockValue,
                    motivo: "Importación CSV",
                    usuario: userId || undefined,
                  },
                });
              }
            });

            creados++;
          }
        } else {
          await prisma.$transaction(async (tx) => {
            const newRepuesto = await tx.repuesto.create({
              data: { ...data, stock: stockValue },
            });

            if (stockValue > 0) {
              await tx.movimientoStock.create({
                data: {
                  repuestoId: newRepuesto.id,
                  tipo: "IMPORTACION",
                  cantidad: stockValue,
                  stockAnterior: 0,
                  stockNuevo: stockValue,
                  motivo: "Importación CSV",
                  usuario: userId || undefined,
                },
              });
            }
          });

          creados++;
        }
      } catch (error) {
        errores.push({
          fila,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    // Emit bulk import event
    eventBus.emit(
      OPERATIONS.inventory.part.import_bulk,
      "Repuesto",
      "bulk",
      { cantidadImportada: creados + actualizados, errores: errores.length },
      userId
    ).catch((err) => {
      console.error("Error emitting inventory.part.import_bulk event:", err);
    });

    return NextResponse.json({ creados, actualizados, errores });
  } catch (error: unknown) {
    console.error("Error importing repuestos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
