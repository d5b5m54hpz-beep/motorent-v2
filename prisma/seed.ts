import { PrismaClient, TipoMoto, EstadoMoto, EstadoCliente } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedPermissions } from './seed-permissions';

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
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA125BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA126BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA128BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA129BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA130BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA131BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2026, cilindrada: 125, color: 'Negro', patente: 'AA132BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 0, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
    // Otras motos
    { marca: 'Yamaha', modelo: 'MT-03', anio: 2024, cilindrada: 321, color: 'Negro', patente: 'AI345JJ', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 3000, precioMensual: 280000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Yamaha', modelo: 'FZ25', anio: 2024, cilindrada: 249, color: 'Azul', patente: 'AC456DD', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 5000, precioMensual: 220000, tipo: 'NAKED' as TipoMoto },
    { marca: 'Honda', modelo: 'XR150', anio: 2022, cilindrada: 149, color: 'Blanco', patente: 'AG012HH', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 25000, precioMensual: 160000, tipo: 'SPORT' as TipoMoto },
    { marca: 'Honda', modelo: 'CB125F', anio: 2023, cilindrada: 125, color: 'Negro', patente: 'AA123BB', estado: 'DISPONIBLE' as EstadoMoto, kilometraje: 12000, precioMensual: 180000, tipo: 'NAKED' as TipoMoto },
  ];

  for (const moto of motos) {
    await prisma.moto.upsert({
      where: { patente: moto.patente },
      update: {},
      create: moto,
    });
  }
  console.log(`✅ ${motos.length} motos created`);

  // 4. Crear un cliente de ejemplo
  const clientePassword = await bcrypt.hash('cliente123', 10);
  const clienteUser = await prisma.user.upsert({
    where: { email: 'cliente@test.com' },
    update: { password: clientePassword, role: 'CLIENTE' },
    create: {
      email: 'cliente@test.com',
      name: 'Juan Pérez',
      role: 'CLIENTE',
      password: clientePassword,
      provider: 'credentials',
    },
  });

  await prisma.cliente.upsert({
    where: { email: 'cliente@test.com' },
    update: {},
    create: {
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
      estado: 'APROBADO' as EstadoCliente,
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

  // 6. Planes de Mantenimiento
  console.log('Creating maintenance plans...');

  // Plan BÁSICO (0 - 4.999 km)
  const planBasico = await prisma.planMantenimiento.upsert({
    where: { id: 'plan-basico' },
    update: {},
    create: {
      id: 'plan-basico',
      nombre: 'Service Básico',
      tipo: 'BASICO',
      descripcion: 'Service preventivo mensual para motos con 0-4.999 km desde último service',
      kmDesde: 0,
      kmHasta: 4999,
      activo: true,
    },
  });

  const tareasBasico: any[] = [
    { nombre: 'Cambio de aceite motor (0.8L)', descripcion: null, categoria: 'MOTOR', orden: 1, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Limpieza del colador/tamiz de aceite', descripcion: null, categoria: 'MOTOR', orden: 2, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Limpieza del filtro de aire', descripcion: null, categoria: 'MOTOR', orden: 3, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Lubricación de cadena de transmisión', descripcion: null, categoria: 'TRANSMISION', orden: 4, obligatoria: true, tiempoEstimado: 5 },
    { nombre: 'Ajuste de tensión de cadena (holgura 15-25mm)', descripcion: null, categoria: 'TRANSMISION', orden: 5, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Verificación y ajuste de freno delantero', descripcion: null, categoria: 'FRENOS', orden: 6, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Verificación y ajuste de freno trasero', descripcion: null, categoria: 'FRENOS', orden: 7, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Verificación de presión de neumáticos', descripcion: null, categoria: 'NEUMATICOS', orden: 8, obligatoria: true, tiempoEstimado: 5 },
    { nombre: 'Inspección visual de estado de cubiertas', descripcion: null, categoria: 'NEUMATICOS', orden: 9, obligatoria: true, tiempoEstimado: 5 },
    { nombre: 'Verificación de luces (faro, stop, giros)', descripcion: null, categoria: 'ELECTRICO', orden: 10, obligatoria: true, tiempoEstimado: 5 },
    { nombre: 'Verificación de bocina', descripcion: null, categoria: 'ELECTRICO', orden: 11, obligatoria: true, tiempoEstimado: 2 },
    { nombre: 'Control de estado de cables (acelerador, frenos)', descripcion: null, categoria: 'GENERAL', orden: 12, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Verificación de apriete de tornillería general', descripcion: null, categoria: 'GENERAL', orden: 13, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Registro de kilometraje actual', descripcion: null, categoria: 'GENERAL', orden: 14, obligatoria: true, tiempoEstimado: 2 },
  ];

  for (const tarea of tareasBasico) {
    await prisma.tareaPlan.create({
      data: {
        ...tarea,
        planId: planBasico.id,
      },
    });
  }
  console.log(`✅ Plan Básico: ${tareasBasico.length} tareas`);

  // Plan INTERMEDIO (5.000 - 9.999 km)
  const planIntermedio = await prisma.planMantenimiento.upsert({
    where: { id: 'plan-intermedio' },
    update: {},
    create: {
      id: 'plan-intermedio',
      nombre: 'Service Intermedio',
      tipo: 'INTERMEDIO',
      descripcion: 'Service preventivo para motos con 5.000-9.999 km desde último service (incluye tareas del básico + tareas adicionales)',
      kmDesde: 5000,
      kmHasta: 9999,
      activo: true,
    },
  });

  const tareasIntermedio: any[] = [
    ...tareasBasico,
    { nombre: 'Reemplazo del filtro de aire', descripcion: null, categoria: 'MOTOR', orden: 15, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Limpieza/calibración o reemplazo de bujía', descripcion: null, categoria: 'MOTOR', orden: 16, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Regulación de válvulas (admisión y escape)', descripcion: null, categoria: 'MOTOR', orden: 17, obligatoria: true, tiempoEstimado: 45 },
    { nombre: 'Ajuste de carburador/ralentí', descripcion: null, categoria: 'MOTOR', orden: 18, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Limpieza del respiradero del cárter', descripcion: null, categoria: 'MOTOR', orden: 19, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Medición de desgaste de pastillas/zapatas', descripcion: null, categoria: 'FRENOS', orden: 20, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Lubricación de cables (acelerador, freno, embrague)', descripcion: null, categoria: 'GENERAL', orden: 21, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Inspección de suspensión delantera y trasera', descripcion: null, categoria: 'SUSPENSION', orden: 22, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Verificación de batería y conexiones', descripcion: null, categoria: 'ELECTRICO', orden: 23, obligatoria: true, tiempoEstimado: 10 },
    { nombre: 'Inspección de rodamientos de dirección', descripcion: null, categoria: 'GENERAL', orden: 24, obligatoria: true, tiempoEstimado: 15 },
  ];

  for (const tarea of tareasIntermedio) {
    await prisma.tareaPlan.create({
      data: {
        ...tarea,
        planId: planIntermedio.id,
      },
    });
  }
  console.log(`✅ Plan Intermedio: ${tareasIntermedio.length} tareas`);

  // Plan MAYOR (10.000+ km)
  const planMayor = await prisma.planMantenimiento.upsert({
    where: { id: 'plan-mayor' },
    update: {},
    create: {
      id: 'plan-mayor',
      nombre: 'Service Mayor',
      tipo: 'MAYOR',
      descripcion: 'Service preventivo completo para motos con 10.000+ km desde último service (incluye todas las tareas + revisión integral)',
      kmDesde: 10000,
      kmHasta: 999999,
      activo: true,
    },
  });

  const tareasMayor: any[] = [
    ...tareasIntermedio,
    { nombre: 'Reemplazo de kit de arrastre (cadena + corona + piñón)', descripcion: null, categoria: 'TRANSMISION', orden: 25, obligatoria: true, tiempoEstimado: 60 },
    { nombre: 'Reemplazo de pastillas/zapatas de freno', descripcion: null, categoria: 'FRENOS', orden: 26, obligatoria: true, tiempoEstimado: 30 },
    { nombre: 'Evaluación y posible reemplazo de cubiertas', descripcion: null, categoria: 'NEUMATICOS', orden: 27, obligatoria: false, tiempoEstimado: 30 },
    { nombre: 'Reemplazo de cables deteriorados', descripcion: null, categoria: 'GENERAL', orden: 28, obligatoria: false, tiempoEstimado: 20 },
    { nombre: 'Evaluación y posible reemplazo de batería', descripcion: null, categoria: 'ELECTRICO', orden: 29, obligatoria: false, tiempoEstimado: 10 },
    { nombre: 'Revisión de cadena de distribución', descripcion: null, categoria: 'MOTOR', orden: 30, obligatoria: true, tiempoEstimado: 30 },
    { nombre: 'Revisión integral del motor (compresión, consumo de aceite)', descripcion: null, categoria: 'MOTOR', orden: 31, obligatoria: true, tiempoEstimado: 45 },
    { nombre: 'Revisión del sistema de escape', descripcion: null, categoria: 'GENERAL', orden: 32, obligatoria: true, tiempoEstimado: 15 },
    { nombre: 'Inspección de embrague centrífugo', descripcion: null, categoria: 'GENERAL', orden: 33, obligatoria: true, tiempoEstimado: 30 },
    { nombre: 'Revisión de bujes y rulemanes de ruedas', descripcion: null, categoria: 'GENERAL', orden: 34, obligatoria: true, tiempoEstimado: 30 },
    { nombre: 'Evaluación general: continuidad vs reemplazo de la moto', descripcion: null, categoria: 'GENERAL', orden: 35, obligatoria: true, tiempoEstimado: 15 },
  ];

  for (const tarea of tareasMayor) {
    await prisma.tareaPlan.create({
      data: {
        ...tarea,
        planId: planMayor.id,
      },
    });
  }
  console.log(`✅ Plan Mayor: ${tareasMayor.length} tareas`);

  // 7. Taller de ejemplo
  const tallerCentral = await prisma.taller.upsert({
    where: { id: 'taller-central' },
    update: {},
    create: {
      id: 'taller-central',
      nombre: 'Taller Central MotoLibre',
      direccion: 'Av. Córdoba 5678, CABA',
      telefono: '+54 11 4567-8901',
      email: 'taller@motolibre.com',
      tipo: 'INTERNO',
      activo: true,
      capacidadDiaria: 15,
      horarioApertura: '08:00',
      horarioCierre: '18:00',
      diasOperacion: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'],
    },
  });
  console.log('✅ Taller Central creado');

  // 8. Mecánico de ejemplo
  await prisma.mecanico.create({
    data: {
      nombre: 'Carlos López',
      telefono: '+54 11 9876-5432',
      email: 'carlos.lopez@motolibre.com',
      especialidad: 'General',
      tallerId: tallerCentral.id,
      activo: true,
      tarifaHora: 8000,
    },
  });
  console.log('✅ Mecánico de ejemplo creado');

  // 9. Permissions system (operations, profiles, grants, user migration)
  await seedPermissions();

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
