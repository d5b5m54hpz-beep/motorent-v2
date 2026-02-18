import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }
    let cliente = await prisma.cliente.findUnique({ where: { userId: user.id } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { userId: user.id, nombre: user.name || "", email: user.email || "" } });
      return NextResponse.json({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    }
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "10");
    const estado = url.searchParams.get("estado");
    const where: Record<string, unknown> = { clienteId: cliente.id };
    if (estado) where.estado = estado;
    const [data, total] = await Promise.all([
      prisma.contrato.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { moto: { select: { id: true, marca: true, modelo: true, patente: true, imagen: true, precioMensual: true, tipo: true } }, pagos: { select: { id: true, estado: true, monto: true, vencimientoAt: true, pagadoAt: true }, orderBy: { vencimientoAt: "asc" } } } }),
      prisma.contrato.count({ where }),
    ]);
    const contratos = data.map((contrato) => {
      const totalPagos = contrato.pagos.length;
      const pagosPagados = contrato.pagos.filter((p) => p.estado === "APROBADO").length;
      return { ...contrato, _stats: { totalPagos, pagosPagados, progreso: totalPagos > 0 ? (pagosPagados / totalPagos) * 100 : 0 } };
    });
    return NextResponse.json({ data: contratos, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    console.error("Error fetching client contracts:", error);
    return NextResponse.json({ error: "Error al cargar contratos" }, { status: 500 });
  }
}
