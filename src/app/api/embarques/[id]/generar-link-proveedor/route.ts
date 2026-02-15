import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verificar que el embarque existe
    const embarque = await prisma.embarqueImportacion.findUnique({
      where: { id },
      select: { id: true, referencia: true },
    });

    if (!embarque) {
      return NextResponse.json({ error: "Embarque no encontrado" }, { status: 404 });
    }

    // Buscar o crear token
    let token = await prisma.portalProveedorToken.findUnique({
      where: { embarqueId: id },
    });

    if (!token) {
      token = await prisma.portalProveedorToken.create({
        data: {
          embarqueId: id,
        },
      });
    }

    // Generar URL pública
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/supplier/${token.token}`;

    return NextResponse.json({
      token: token.token,
      url: publicUrl,
      embarqueRef: embarque.referencia,
    });
  } catch (error: unknown) {
    console.error("Error generando link proveedor:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
