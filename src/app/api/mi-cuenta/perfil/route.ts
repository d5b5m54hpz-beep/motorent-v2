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
    let cliente = await prisma.cliente.findUnique({ where: { userId: user.id }, include: { user: { select: { name: true, email: true, image: true } } } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { userId: user.id, nombre: user.name || "", email: user.email || "" }, include: { user: { select: { name: true, email: true, image: true } } } });
    }
    return NextResponse.json(cliente);
  } catch (error: unknown) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error al cargar perfil" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 });
    }
    const body = await req.json();
    let cliente = await prisma.cliente.findUnique({ where: { userId: user.id } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { userId: user.id, nombre: body.nombre || user.name || "", email: user.email || "", telefono: body.telefono || null, dni: body.dni || null, licencia: body.licencia || null, direccion: body.direccion || null, ciudad: body.ciudad || null, provincia: body.provincia || null, codigoPostal: body.codigoPostal || null }, include: { user: { select: { name: true, email: true, image: true } } } });
      return NextResponse.json(cliente);
    }
    const updated = await prisma.cliente.update({ where: { id: cliente.id }, data: { nombre: body.nombre ?? cliente.nombre, telefono: body.telefono ?? cliente.telefono, dni: body.dni ?? cliente.dni, licencia: body.licencia ?? cliente.licencia, direccion: body.direccion ?? cliente.direccion, ciudad: body.ciudad ?? cliente.ciudad, provincia: body.provincia ?? cliente.provincia, codigoPostal: body.codigoPostal ?? cliente.codigoPostal }, include: { user: { select: { name: true, email: true, image: true } } } });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al guardar perfil" }, { status: 500 });
  }
}
