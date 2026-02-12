import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@motolibre.com' },
    update: { password: adminPassword, role: 'ADMIN' },
    create: {
      email: 'admin@motolibre.com',
      name: 'Admin MotoLibre',
      role: 'ADMIN',
      password: adminPassword,
      provider: 'credentials',
    },
  });
  console.log('✅ Admin:', admin.email);

  // 2. También crear el admin de Dante (Google OAuth)
  await prisma.user.upsert({
    where: { email: 'dantebustos@gmail.com' },
    update: { role: 'ADMIN', name: 'Dante Bustos' },
    create: {
      email: 'dantebustos@gmail.com',
      name: 'Dante Bustos',
      role: 'ADMIN',
      provider: 'google',
    },
  });
  console.log('✅ Admin Google OAuth created');

  // 3. Crear motos de ejemplo (flota real - 11 motos)
  const motos = [
    // Flota CB125F (7 unidades)
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA125BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA126BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA128BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA129BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA130BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA131BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA132BB', estado: 'disponible', kilometraje: 0, precioMensual: 180000, tipo: 'naked' },
    // Otras motos
    { marca: 'Yamaha', modelo: 'MT-03', anio: 2024, cilindrada: 321, color: 'Negro', patente: 'AI345JJ', estado: 'disponible', kilometraje: 3000, precioMensual: 280000, tipo: 'naked' },
    { marca: 'Yamaha', modelo: 'FZ25', anio: 2024, cilindrada: 249, color: 'Azul', patente: 'AC456DD', estado: 'disponible', kilometraje: 5000, precioMensual: 220000, tipo: 'naked' },
    { marca: 'Honda', modelo: 'XR150', anio: 2022, cilindrada: 149, color: 'Blanco', patente: 'AG012HH', estado: 'disponible', kilometraje: 25000, precioMensual: 160000, tipo: 'sport' },
    { marca: 'Honda', modelo: 'CB125F', anio: 2023, cilindrada: 125, color: 'Negro', patente: 'AA123BB', estado: 'disponible', kilometraje: 12000, precioMensual: 180000, tipo: 'naked' },
  ];

  for (const moto of motos) {
    await prisma.moto.create({
      data: moto,
    });
  }
  console.log(`✅ ${motos.length} motos created`);

  // 4. Crear un cliente de ejemplo
  const clientePassword = await bcrypt.hash('cliente123', 10);
  const clienteUser = await prisma.user.create({
    data: {
      email: 'cliente@test.com',
      name: 'Juan Pérez',
      role: 'CLIENTE',
      password: clientePassword,
      provider: 'credentials',
    },
  });

  await prisma.cliente.create({
    data: {
      userId: clienteUser.id,
      email: 'cliente@test.com',
      nombre: 'Juan Pérez',
      dni: '30123456',
      dniVerificado: true,
      telefono: '+54 11 5555-1234',
      direccion: 'Av. Corrientes 1234',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: 'C1043',
      fechaNacimiento: new Date('1990-05-15'),
      estado: 'aprobado',
    },
  });
  console.log('✅ Cliente de ejemplo creado');

  // 5. Pricing config
  await prisma.pricingConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      precioBaseMensual: 180000,
      descuentoSemanal: 10,
      descuentoMeses3: 5,
      descuentoMeses6: 10,
      descuentoMeses9: 15,
      descuentoMeses12: 20,
    },
  });
  console.log('✅ Pricing config created');

  console.log('🎉 Seed completed!');
  console.log('');
  console.log('Credenciales:');
  console.log('  Admin: admin@motolibre.com / admin123');
  console.log('  Cliente: cliente@test.com / cliente123');
  console.log('  Google OAuth: dantebustos@gmail.com (ADMIN)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
