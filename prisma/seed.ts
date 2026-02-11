import { PrismaClient, Role, TipoCuenta } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@motorent.com" },
    update: { password: adminPassword, role: Role.ADMIN },
    create: {
      email: "admin@motorent.com",
      name: "Admin MotoRent",
      password: adminPassword,
      provider: "credentials",
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin:", admin.email);

  // Create Cliente for admin (so they can test Mi Cuenta)
  await prisma.cliente.upsert({
    where: { email: "admin@motorent.com" },
    update: {},
    create: {
      userId: admin.id,
      email: "admin@motorent.com",
      nombre: "Admin MotoRent",
      telefono: "+54 11 1234-5678",
      dni: "12345678",
      dniVerificado: true,
      licencia: "B-000001",
      licenciaVencimiento: new Date("2028-12-31"),
      licenciaVerificada: true,
      direccion: "Av. 9 de Julio 1000",
      ciudad: "Buenos Aires",
      provincia: "CABA",
      codigoPostal: "C1043",
      fechaNacimiento: new Date("1985-01-01"),
      estado: "aprobado",
    },
  });
  console.log("✅ Admin cliente profile created");

  // Default pricing
  await prisma.pricingConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      precioBaseMensual: 180000,
      descuentoSemanal: 10,
      descuentoMeses3: 5,
      descuentoMeses6: 10,
      descuentoMeses9: 15,
      descuentoMeses12: 20,
    },
  });
  console.log("✅ Pricing config created");

  // Sample motos
  const motos = [
    { marca: "Honda", modelo: "CB125F", patente: "AA123BB", anio: 2023, color: "Negro", kilometraje: 12000, precioMensual: 180000, cilindrada: 125, tipo: "naked" },
    { marca: "Yamaha", modelo: "FZ25", patente: "AC456DD", anio: 2024, color: "Azul", kilometraje: 5000, precioMensual: 220000, cilindrada: 249, tipo: "naked" },
    { marca: "Bajaj", modelo: "Dominar 250", patente: "AE789FF", anio: 2023, color: "Rojo", kilometraje: 8000, precioMensual: 200000, cilindrada: 248, tipo: "touring" },
    { marca: "Honda", modelo: "XR150", patente: "AG012HH", anio: 2022, color: "Blanco", kilometraje: 25000, precioMensual: 160000, cilindrada: 149, tipo: "sport" },
    { marca: "Yamaha", modelo: "MT-03", patente: "AI345JJ", anio: 2024, color: "Negro", kilometraje: 3000, precioMensual: 280000, cilindrada: 321, tipo: "naked" },
  ];

  for (const moto of motos) {
    await prisma.moto.upsert({
      where: { patente: moto.patente },
      update: { color: moto.color, kilometraje: moto.kilometraje, precioMensual: moto.precioMensual, cilindrada: moto.cilindrada, tipo: moto.tipo },
      create: moto,
    });
  }
  console.log(`✅ ${motos.length} motos created`);

  // Sample clientes
  const clientePassword = await bcrypt.hash("cliente123", 10);
  const clientes = [
    {
      email: "juan.perez@email.com",
      name: "Juan Perez",
      phone: "+54 11 4567-8901",
      cliente: {
        nombre: "Juan Perez",
        dni: "35123456",
        dniVerificado: true,
        licencia: "B-123456",
        licenciaVencimiento: new Date("2026-12-31"),
        licenciaVerificada: true,
        direccion: "Av. Corrientes 1234",
        ciudad: "Buenos Aires",
        provincia: "CABA",
        codigoPostal: "C1043",
        fechaNacimiento: new Date("1990-05-15"),
        estado: "aprobado",
      },
    },
    {
      email: "maria.gomez@email.com",
      name: "Maria Gomez",
      phone: "+54 11 5678-9012",
      cliente: {
        nombre: "Maria Gomez",
        dni: "38234567",
        dniVerificado: true,
        licencia: "B-234567",
        licenciaVencimiento: new Date("2027-03-15"),
        licenciaVerificada: false,
        direccion: "Calle Florida 456",
        ciudad: "Buenos Aires",
        provincia: "CABA",
        codigoPostal: "C1005",
        fechaNacimiento: new Date("1993-08-22"),
        estado: "aprobado",
      },
    },
    {
      email: "carlos.rodriguez@email.com",
      name: "Carlos Rodriguez",
      phone: "+54 11 6789-0123",
      cliente: {
        nombre: "Carlos Rodriguez",
        dni: "40345678",
        dniVerificado: false,
        ciudad: "Palermo",
        provincia: "CABA",
        estado: "pendiente",
      },
    },
  ];

  for (const { email, name, phone, cliente } of clientes) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        phone,
        password: clientePassword,
        provider: "credentials",
        role: Role.CLIENTE,
      },
    });

    await prisma.cliente.upsert({
      where: { email },
      update: {},
      create: {
        userId: user.id,
        email,
        telefono: phone,
        ...cliente,
      },
    });
  }
  console.log(`✅ ${clientes.length} clientes created`);

  // Sample contratos
  const juanCliente = await prisma.cliente.findUnique({
    where: { email: "juan.perez@email.com" },
  });
  const mariaCliente = await prisma.cliente.findUnique({
    where: { email: "maria.gomez@email.com" },
  });
  const hondaCB = await prisma.moto.findUnique({
    where: { patente: "AA123BB" },
  });
  const yamahaFZ = await prisma.moto.findUnique({
    where: { patente: "AC456DD" },
  });

  if (juanCliente && hondaCB) {
    // Contrato 1: Juan Perez - Honda CB125F - 3 meses - Mensual - Activo
    const fechaInicio1 = new Date("2026-01-01");
    const fechaFin1 = new Date("2026-04-01");
    const montoPeriodo1 = 171000; // 180000 - 5% descuento 3 meses
    const montoTotal1 = montoPeriodo1 * 3;

    const contrato1 = await prisma.contrato.create({
      data: {
        clienteId: juanCliente.id,
        motoId: hondaCB.id,
        fechaInicio: fechaInicio1,
        fechaFin: fechaFin1,
        frecuenciaPago: "mensual",
        montoPeriodo: montoPeriodo1,
        montoTotal: montoTotal1,
        deposito: 50000,
        descuentoAplicado: 5,
        notas: "Contrato de ejemplo - cliente verificado",
        renovacionAuto: false,
        estado: "activo",
      },
    });

    // Generar 3 pagos mensuales
    await prisma.pago.createMany({
      data: [
        {
          contratoId: contrato1.id,
          monto: montoPeriodo1,
          metodo: "efectivo",
          estado: "pagado",
          vencimientoAt: new Date("2026-02-01"),
          pagadoAt: new Date("2026-01-28"),
        },
        {
          contratoId: contrato1.id,
          monto: montoPeriodo1,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-03-01"),
        },
        {
          contratoId: contrato1.id,
          monto: montoPeriodo1,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-04-01"),
        },
      ],
    });

    // Actualizar moto a alquilada
    await prisma.moto.update({
      where: { id: hondaCB.id },
      data: { estado: "alquilada" },
    });

    console.log("✅ Contrato 1 created (Juan - Honda CB125F - Activo)");
  }

  if (mariaCliente && yamahaFZ) {
    // Contrato 2: Maria Gomez - Yamaha FZ25 - 1 mes - Semanal - Pendiente
    const fechaInicio2 = new Date("2026-02-15");
    const fechaFin2 = new Date("2026-03-15");
    const montoPeriodo2 = 49500; // 220000 / 4 semanas - 10% descuento semanal
    const montoTotal2 = montoPeriodo2 * 4;

    const contrato2 = await prisma.contrato.create({
      data: {
        clienteId: mariaCliente.id,
        motoId: yamahaFZ.id,
        fechaInicio: fechaInicio2,
        fechaFin: fechaFin2,
        frecuenciaPago: "semanal",
        montoPeriodo: montoPeriodo2,
        montoTotal: montoTotal2,
        deposito: 30000,
        descuentoAplicado: 10,
        notas: "Contrato semanal - inicio próximo",
        renovacionAuto: true,
        estado: "pendiente",
      },
    });

    // Generar 4 pagos semanales
    await prisma.pago.createMany({
      data: [
        {
          contratoId: contrato2.id,
          monto: montoPeriodo2,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-02-22"),
        },
        {
          contratoId: contrato2.id,
          monto: montoPeriodo2,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-03-01"),
        },
        {
          contratoId: contrato2.id,
          monto: montoPeriodo2,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-03-08"),
        },
        {
          contratoId: contrato2.id,
          monto: montoPeriodo2,
          metodo: "pendiente",
          estado: "pendiente",
          vencimientoAt: new Date("2026-03-15"),
        },
      ],
    });

    // Actualizar moto a alquilada
    await prisma.moto.update({
      where: { id: yamahaFZ.id },
      data: { estado: "alquilada" },
    });

    console.log("✅ Contrato 2 created (Maria - Yamaha FZ25 - Pendiente)");
  }

  // Plan de Cuentas Argentino
  const cuentas: Array<{
    codigo: string;
    nombre: string;
    tipo: TipoCuenta;
    nivel: number;
    imputable: boolean;
    padre?: string;
  }> = [
    // ACTIVO
    { codigo: "1", nombre: "ACTIVO", tipo: "ACTIVO" as TipoCuenta, nivel: 1, imputable: false },
    { codigo: "1.1", nombre: "ACTIVO CORRIENTE", tipo: "ACTIVO" as TipoCuenta, padre: "1", nivel: 2, imputable: false },
    { codigo: "1.1.01", nombre: "Caja y Bancos", tipo: "ACTIVO" as TipoCuenta, padre: "1.1", nivel: 3, imputable: false },
    { codigo: "1.1.01.001", nombre: "Caja en Pesos", tipo: "ACTIVO" as TipoCuenta, padre: "1.1.01", nivel: 4, imputable: true },
    { codigo: "1.1.01.002", nombre: "Banco Cuenta Corriente", tipo: "ACTIVO" as TipoCuenta, padre: "1.1.01", nivel: 4, imputable: true },
    { codigo: "1.1.01.003", nombre: "Mercado Pago", tipo: "ACTIVO" as TipoCuenta, padre: "1.1.01", nivel: 4, imputable: true },
    { codigo: "1.1.02", nombre: "Créditos por Ventas", tipo: "ACTIVO" as TipoCuenta, padre: "1.1", nivel: 3, imputable: false },
    { codigo: "1.1.02.001", nombre: "Deudores por Alquileres", tipo: "ACTIVO" as TipoCuenta, padre: "1.1.02", nivel: 4, imputable: true },
    { codigo: "1.1.03", nombre: "Otros Créditos", tipo: "ACTIVO" as TipoCuenta, padre: "1.1", nivel: 3, imputable: false },
    { codigo: "1.1.03.001", nombre: "Anticipos a Proveedores", tipo: "ACTIVO" as TipoCuenta, padre: "1.1.03", nivel: 4, imputable: true },

    { codigo: "1.2", nombre: "ACTIVO NO CORRIENTE", tipo: "ACTIVO" as TipoCuenta, padre: "1", nivel: 2, imputable: false },
    { codigo: "1.2.01", nombre: "Bienes de Uso", tipo: "ACTIVO" as TipoCuenta, padre: "1.2", nivel: 3, imputable: false },
    { codigo: "1.2.01.001", nombre: "Motos", tipo: "ACTIVO" as TipoCuenta, padre: "1.2.01", nivel: 4, imputable: true },
    { codigo: "1.2.01.002", nombre: "Motos - Amortización Acumulada", tipo: "ACTIVO" as TipoCuenta, padre: "1.2.01", nivel: 4, imputable: true },
    { codigo: "1.2.01.003", nombre: "Muebles y Útiles", tipo: "ACTIVO" as TipoCuenta, padre: "1.2.01", nivel: 4, imputable: true },
    { codigo: "1.2.01.004", nombre: "Equipos de Computación", tipo: "ACTIVO" as TipoCuenta, padre: "1.2.01", nivel: 4, imputable: true },

    // PASIVO
    { codigo: "2", nombre: "PASIVO", tipo: "PASIVO" as TipoCuenta, nivel: 1, imputable: false },
    { codigo: "2.1", nombre: "PASIVO CORRIENTE", tipo: "PASIVO" as TipoCuenta, padre: "2", nivel: 2, imputable: false },
    { codigo: "2.1.01", nombre: "Deudas Comerciales", tipo: "PASIVO" as TipoCuenta, padre: "2.1", nivel: 3, imputable: false },
    { codigo: "2.1.01.001", nombre: "Proveedores", tipo: "PASIVO" as TipoCuenta, padre: "2.1.01", nivel: 4, imputable: true },
    { codigo: "2.1.02", nombre: "Deudas Fiscales", tipo: "PASIVO" as TipoCuenta, padre: "2.1", nivel: 3, imputable: false },
    { codigo: "2.1.02.001", nombre: "IVA Débito Fiscal", tipo: "PASIVO" as TipoCuenta, padre: "2.1.02", nivel: 4, imputable: true },
    { codigo: "2.1.02.002", nombre: "IVA Crédito Fiscal", tipo: "PASIVO" as TipoCuenta, padre: "2.1.02", nivel: 4, imputable: true },
    { codigo: "2.1.02.003", nombre: "IIBB a Pagar", tipo: "PASIVO" as TipoCuenta, padre: "2.1.02", nivel: 4, imputable: true },
    { codigo: "2.1.02.004", nombre: "Impuestos a Pagar", tipo: "PASIVO" as TipoCuenta, padre: "2.1.02", nivel: 4, imputable: true },

    // PATRIMONIO
    { codigo: "3", nombre: "PATRIMONIO NETO", tipo: "PATRIMONIO" as TipoCuenta, nivel: 1, imputable: false },
    { codigo: "3.1", nombre: "Capital", tipo: "PATRIMONIO" as TipoCuenta, padre: "3", nivel: 2, imputable: true },
    { codigo: "3.2", nombre: "Resultados Acumulados", tipo: "PATRIMONIO" as TipoCuenta, padre: "3", nivel: 2, imputable: true },
    { codigo: "3.3", nombre: "Resultado del Ejercicio", tipo: "PATRIMONIO" as TipoCuenta, padre: "3", nivel: 2, imputable: true },

    // INGRESOS
    { codigo: "4", nombre: "INGRESOS", tipo: "INGRESO" as TipoCuenta, nivel: 1, imputable: false },
    { codigo: "4.1", nombre: "Ingresos Operativos", tipo: "INGRESO" as TipoCuenta, padre: "4", nivel: 2, imputable: false },
    { codigo: "4.1.01", nombre: "Alquileres de Motos", tipo: "INGRESO" as TipoCuenta, padre: "4.1", nivel: 3, imputable: true },
    { codigo: "4.1.02", nombre: "Venta de Servicios Adicionales", tipo: "INGRESO" as TipoCuenta, padre: "4.1", nivel: 3, imputable: true },
    { codigo: "4.2", nombre: "Otros Ingresos", tipo: "INGRESO" as TipoCuenta, padre: "4", nivel: 2, imputable: false },
    { codigo: "4.2.01", nombre: "Intereses Ganados", tipo: "INGRESO" as TipoCuenta, padre: "4.2", nivel: 3, imputable: true },

    // EGRESOS
    { codigo: "5", nombre: "EGRESOS", tipo: "EGRESO" as TipoCuenta, nivel: 1, imputable: false },
    { codigo: "5.1", nombre: "Costo de Servicios", tipo: "EGRESO" as TipoCuenta, padre: "5", nivel: 2, imputable: false },
    { codigo: "5.1.01", nombre: "Mantenimiento de Motos", tipo: "EGRESO" as TipoCuenta, padre: "5.1", nivel: 3, imputable: true },
    { codigo: "5.1.02", nombre: "Repuestos", tipo: "EGRESO" as TipoCuenta, padre: "5.1", nivel: 3, imputable: true },
    { codigo: "5.1.03", nombre: "Combustible", tipo: "EGRESO" as TipoCuenta, padre: "5.1", nivel: 3, imputable: true },
    { codigo: "5.1.04", nombre: "Seguros", tipo: "EGRESO" as TipoCuenta, padre: "5.1", nivel: 3, imputable: true },
    { codigo: "5.1.05", nombre: "Patentes", tipo: "EGRESO" as TipoCuenta, padre: "5.1", nivel: 3, imputable: true },

    { codigo: "5.2", nombre: "Gastos Administrativos", tipo: "EGRESO" as TipoCuenta, padre: "5", nivel: 2, imputable: false },
    { codigo: "5.2.01", nombre: "Sueldos y Jornales", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },
    { codigo: "5.2.02", nombre: "Cargas Sociales", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },
    { codigo: "5.2.03", nombre: "Alquiler Local", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },
    { codigo: "5.2.04", nombre: "Servicios (Luz, Gas, Internet)", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },
    { codigo: "5.2.05", nombre: "Honorarios Profesionales", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },
    { codigo: "5.2.06", nombre: "Gastos de Oficina", tipo: "EGRESO" as TipoCuenta, padre: "5.2", nivel: 3, imputable: true },

    { codigo: "5.3", nombre: "Gastos Comerciales", tipo: "EGRESO" as TipoCuenta, padre: "5", nivel: 2, imputable: false },
    { codigo: "5.3.01", nombre: "Publicidad y Marketing", tipo: "EGRESO" as TipoCuenta, padre: "5.3", nivel: 3, imputable: true },
    { codigo: "5.3.02", nombre: "Comisiones", tipo: "EGRESO" as TipoCuenta, padre: "5.3", nivel: 3, imputable: true },

    { codigo: "5.4", nombre: "Gastos Financieros", tipo: "EGRESO" as TipoCuenta, padre: "5", nivel: 2, imputable: false },
    { codigo: "5.4.01", nombre: "Intereses Bancarios", tipo: "EGRESO" as TipoCuenta, padre: "5.4", nivel: 3, imputable: true },
    { codigo: "5.4.02", nombre: "Comisiones Bancarias", tipo: "EGRESO" as TipoCuenta, padre: "5.4", nivel: 3, imputable: true },

    { codigo: "5.5", nombre: "Otros Egresos", tipo: "EGRESO" as TipoCuenta, padre: "5", nivel: 2, imputable: false },
    { codigo: "5.5.01", nombre: "Impuestos y Tasas", tipo: "EGRESO" as TipoCuenta, padre: "5.5", nivel: 3, imputable: true },
    { codigo: "5.5.02", nombre: "Gastos Varios", tipo: "EGRESO" as TipoCuenta, padre: "5.5", nivel: 3, imputable: true },
  ];

  for (const cuenta of cuentas) {
    await prisma.cuentaContable.upsert({
      where: { codigo: cuenta.codigo },
      update: {},
      create: cuenta,
    });
  }
  console.log(`✅ ${cuentas.length} cuentas contables created`);

  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
