import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { repuestoIds, clienteId, listaPrecioCodigo, cantidad = 1 } = body;

    if (!repuestoIds || !Array.isArray(repuestoIds) || repuestoIds.length === 0) {
      return NextResponse.json(
        { error: "repuestoIds debe ser un array no vacío" },
        { status: 400 }
      );
    }

    // Resolver precio para cada repuesto
    const precios = await Promise.all(
      repuestoIds.map(async (repuestoId) => {
        try {
          // Llamar al resolver individual
          const res = await fetch(
            `${req.nextUrl.origin}/api/pricing-repuestos/resolver`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: req.headers.get("cookie") || "",
              },
              body: JSON.stringify({
                repuestoId,
                clienteId,
                listaPrecioCodigo,
                cantidad,
              }),
            }
          );

          if (!res.ok) {
            return {
              repuestoId,
              error: "Error al resolver precio",
              precioFinalArs: 0,
              precioRetailArs: 0,
            };
          }

          const data = await res.json();
          return {
            repuestoId: data.repuestoId,
            nombre: data.nombre,
            categoria: data.categoria,
            precioRetailArs: data.precioRetailArs,
            precioFinalArs: data.precioFinalArs,
            descuentoTotalPct: data.descuentoTotalPct,
            alertaMargen: data.alertaMargen,
            costoBase: data.costoBase,
            margenResultante: data.margenResultante,
          };
        } catch (error) {
          console.error(`Error resolviendo ${repuestoId}:`, error);
          return {
            repuestoId,
            error: "Error al resolver precio",
            precioFinalArs: 0,
            precioRetailArs: 0,
          };
        }
      })
    );

    return NextResponse.json({ precios });
  } catch (err: unknown) {
    console.error("Error resolviendo precios bulk:", err);
    return NextResponse.json(
      { error: "Error al resolver precios" },
      { status: 500 }
    );
  }
}
