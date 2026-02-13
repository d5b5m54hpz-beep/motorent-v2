import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importRepuestoSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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
                    usuario: session.user.email || undefined,
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
                    usuario: session.user.email || undefined,
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
                  usuario: session.user.email || undefined,
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

    return NextResponse.json({ creados, actualizados, errores });
  } catch (error: unknown) {
    console.error("Error importing repuestos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
