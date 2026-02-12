import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { error } = await requireRole(["ADMIN", "RRHH_MANAGER", "VIEWER"]);
  if (error) return error;

  try {
    const empleadosActivos = await prisma.empleado.count({ where: { estado: "ACTIVO" } });

    return NextResponse.json({
      empleadosActivos,
      costoLaboralMensual: 0, // Placeholder
    });
  } catch (err: unknown) {
    console.error("Error fetching dashboard rrhh:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
