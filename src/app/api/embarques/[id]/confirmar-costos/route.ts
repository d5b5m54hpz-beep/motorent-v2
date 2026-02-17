import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/require-permission";
import { eventBus, OPERATIONS } from "@/lib/events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requirePermission(OPERATIONS.import_shipment.confirm_costs, "execute", ["OPERADOR"]);
  if (error) return error;

  const { id } = await params;

  try {
    const body = await req.json();
    const { costos } = body; // Result from calcular-costos

    if (!costos || !costos.items) {
      return NextResponse.json({ error: "Datos de costos inválidos" }, { status: 400 });
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      const embarque = await tx.embarqueImportacion.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!embarque) {
        throw new Error("Embarque no encontrado");
      }

      const cambios: any[] = [];

      // Process each item
      for (const itemCosto of costos.items) {
        const itemEmbarque = embarque.items.find(i => i.repuestoId === itemCosto.repuestoId);
        if (!itemEmbarque) continue;

        // Get current repuesto data
        const repuesto = await tx.repuesto.findUnique({
          where: { id: itemCosto.repuestoId },
        });

        if (!repuesto) continue;

        const stockAnterior = repuesto.stock;
        const costoAnteriorArs = repuesto.costoPromedioArs || repuesto.precioCompra;
        const costoAnteriorUsd = repuesto.costoPromedioUsd;

        // Calculate new weighted average cost
        const stockActual = stockAnterior;
        const cantidadNueva = itemEmbarque.cantidad;
        const costoNuevoUsd = itemCosto.costoLandedUnitarioUsd;
        const costoNuevoArs = itemCosto.costoLandedUnitarioArs;

        let nuevoPromedioArs: number;
        let nuevoPromedioUsd: number;

        if (stockActual === 0) {
          // If no stock, just use new cost
          nuevoPromedioArs = costoNuevoArs;
          nuevoPromedioUsd = costoNuevoUsd;
        } else {
          // Weighted average formula
          nuevoPromedioArs =
            (stockActual * costoAnteriorArs + cantidadNueva * costoNuevoArs) /
            (stockActual + cantidadNueva);
          nuevoPromedioUsd =
            (stockActual * (costoAnteriorUsd || 0) + cantidadNueva * costoNuevoUsd) /
            (stockActual + cantidadNueva);
        }

        // Update repuesto (solo costos, NO stock)
        // El stock se actualiza en el workflow de recepción (finalizar)
        await tx.repuesto.update({
          where: { id: itemCosto.repuestoId },
          data: {
            costoPromedioArs: nuevoPromedioArs,
            costoPromedioUsd: nuevoPromedioUsd,
            precioCompra: costoNuevoArs, // For backwards compatibility
            ultimoCostoUpdate: new Date(),
            // stock NO se actualiza aquí, se actualiza en recepcion/finalizar
          },
        });

        // Create history record (solo costos, NO cantidades)
        await tx.historialCostoRepuesto.create({
          data: {
            repuestoId: itemCosto.repuestoId,
            costoAnteriorArs,
            costoNuevoArs: nuevoPromedioArs,
            costoAnteriorUsd,
            costoNuevoUsd: nuevoPromedioUsd,
            cantidadAnterior: stockActual,
            cantidadNueva: stockActual, // Sin cambio de cantidad aquí
            motivo: "COSTEO_IMPORTACION",
            referencia: id,
            tipoCambio: costos.tipoCambio,
            usuario: userId || null,
          },
        });

        // Create AsignacionCostoImportacion
        await tx.asignacionCostoImportacion.create({
          data: {
            embarqueId: id,
            repuestoId: itemCosto.repuestoId,
            cantidad: itemEmbarque.cantidad,
            fobUnitarioUsd: itemCosto.fobUnitarioUsd,
            fleteUnitarioUsd: itemCosto.desglose.flete,
            seguroUnitarioUsd: itemCosto.desglose.seguro,
            derechosUnitarioUsd: itemCosto.desglose.derechos,
            tasasUnitarioUsd: itemCosto.desglose.tasaEstadistica + itemCosto.desglose.tasasFijas,
            logisticaUnitarioUsd: itemCosto.desglose.logistica,
            costoLandedUnitarioUsd: itemCosto.costoLandedUnitarioUsd,
            costoLandedUnitarioArs: itemCosto.costoLandedUnitarioArs,
            desembolsoUnitarioUsd: itemCosto.desembolsoUnitarioUsd,
            metodoAsignacion: "POR_VALOR", // From request
            tipoCambioUsado: costos.tipoCambio,
          },
        });

        // Update ItemEmbarque
        await tx.itemEmbarque.update({
          where: { id: itemEmbarque.id },
          data: {
            costoLandedUnitarioUsd: itemCosto.costoLandedUnitarioUsd,
            costoLandedUnitarioArs: itemCosto.costoLandedUnitarioArs,
          },
        });

        // MovimientoStock se crea en recepcion/finalizar, NO aquí

        cambios.push({
          repuestoId: itemCosto.repuestoId,
          nombre: itemCosto.nombre,
          costoAnterior: costoAnteriorArs,
          costoNuevo: nuevoPromedioArs,
          variacion: ((nuevoPromedioArs - costoAnteriorArs) / costoAnteriorArs) * 100,
        });
      }

      // Update embarque status and totals
      await tx.embarqueImportacion.update({
        where: { id },
        data: {
          estado: "COSTO_FINALIZADO",
          costoTotalNoRecuperable: costos.costoTotalNoRecuperable,
          costoTotalRecuperable: costos.costoTotalRecuperable,
          desembolsoTotal: costos.desembolsoTotal,
          cifUsd: costos.cifUsd,
          tipoCambioArsUsd: costos.tipoCambio,
        },
      });

      return { cambios };
    });

    eventBus.emit(
      OPERATIONS.import_shipment.confirm_costs,
      "Embarque",
      id,
      { costoLanded: costos.costoTotalNoRecuperable, aranceles: costos.costoTotalRecuperable, gastosAduaneros: costos.desembolsoTotal },
      userId
    ).catch(err => console.error("Error emitting import_shipment.confirm_costs event:", err));

    return NextResponse.json({
      success: true,
      message: "Costos aplicados exitosamente",
      cambios: result.cambios,
    });
  } catch (err: unknown) {
    console.error("Error confirming costs:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al confirmar costos" },
      { status: 500 }
    );
  }
}
