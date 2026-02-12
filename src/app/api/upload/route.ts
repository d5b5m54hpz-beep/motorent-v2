import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadToR2 } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = formData.get('folder') as string || 'general';

  if (!file) {
    return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
  }

  // Validar tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Usar JPG, PNG o WebP.' }, { status: 400 });
  }

  // Validar tamaño (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo no puede superar 5MB' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split('.').pop() || 'jpg';
  const key = `${folder}/${uuidv4()}.${extension}`;

  try {
    const url = await uploadToR2(buffer, key, file.type);
    return NextResponse.json({ url, key });
  } catch (error: unknown) {
    console.error('Error uploading to R2:', error);
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
