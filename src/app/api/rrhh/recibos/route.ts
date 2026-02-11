import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER", "CONTADOR"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const mes = url.searchParams.get("mes");
    const anio = url.searchParams.get("anio");
    const estado = url.searchParams.get("estado");

    const where = {
      ...(mes && { mes: parseInt(mes) }),
      ...(anio && { anio: parseInt(anio) }),
      ...(estado && { estado: estado as any }),
    };

    const recibos = await prisma.reciboSueldo.findMany({
      where,
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
      include: {
        empleado: {
          select: {
            nombre: true,
            apellido: true,
            dni: true,
            cuil: true,
            cargo: true,
          },
        },
      },
    });

    return NextResponse.json({ data: recibos, total: recibos.length });
  } catch (err: unknown) {
    console.error("Error fetching recibos:", err);
    return NextResponse.json({ error: "Error interno del servidor", data: [], total: 0 }, { status: 500 });
  }
}
