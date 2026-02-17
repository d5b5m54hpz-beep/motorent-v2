import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Operation catalog ───────────────────────────────────────────────────────

type OpDef = {
  code: string;
  description: string;
  requiresApproval?: boolean;
  isViewOnly?: boolean;
};

const OPERATION_CATALOG: OpDef[] = [
  // Fleet
  { code: "fleet.moto.create", description: "Crear moto en el sistema" },
  { code: "fleet.moto.update", description: "Actualizar datos de moto" },
  { code: "fleet.moto.decommission", description: "Dar de baja una moto" },
  { code: "fleet.moto.view", description: "Ver motos", isViewOnly: true },
  { code: "fleet.moto.bulk_update", description: "Actualización masiva de motos" },
  { code: "fleet.moto.upload_document", description: "Subir documento de moto" },
  { code: "fleet.moto.delete_document", description: "Eliminar documento de moto" },
  { code: "fleet.moto.update_insurance", description: "Actualizar seguro de moto" },
  { code: "fleet.moto.update_registration", description: "Actualizar patentamiento de moto" },

  // Rental - Contract
  { code: "rental.contract.view", description: "Ver contratos", isViewOnly: true },
  { code: "rental.contract.create", description: "Crear contrato de alquiler" },
  { code: "rental.contract.update", description: "Actualizar contrato" },
  { code: "rental.contract.activate", description: "Activar contrato", requiresApproval: true },
  { code: "rental.contract.terminate", description: "Terminar contrato" },
  { code: "rental.contract.exercise_purchase", description: "Ejercer opción de compra", requiresApproval: true },

  // Rental - Client
  { code: "rental.client.view", description: "Ver clientes", isViewOnly: true },
  { code: "rental.client.create", description: "Crear cliente" },
  { code: "rental.client.approve", description: "Aprobar cliente", requiresApproval: true },
  { code: "rental.client.reject", description: "Rechazar cliente" },
  { code: "rental.client.update", description: "Actualizar datos de cliente" },
  { code: "rental.client.delete", description: "Eliminar cliente" },

  // Payment
  { code: "payment.view", description: "Ver pagos", isViewOnly: true },
  { code: "payment.create", description: "Registrar pago" },
  { code: "payment.update", description: "Actualizar datos de pago" },
  { code: "payment.approve", description: "Aprobar pago", requiresApproval: true },
  { code: "payment.reject", description: "Rechazar pago" },
  { code: "payment.refund", description: "Reembolsar pago", requiresApproval: true },
  { code: "payment.checkout", description: "Iniciar checkout de pago" },

  // Invoice - Sale
  { code: "invoice.sale.view", description: "Ver facturas de venta", isViewOnly: true },
  { code: "invoice.sale.create", description: "Crear factura de venta" },
  { code: "invoice.sale.update", description: "Actualizar factura de venta" },
  { code: "invoice.sale.send", description: "Enviar factura" },
  { code: "invoice.sale.cancel", description: "Anular factura de venta" },

  // Invoice - Purchase
  { code: "invoice.purchase.view", description: "Ver facturas de compra", isViewOnly: true },
  { code: "invoice.purchase.create", description: "Registrar factura de compra" },
  { code: "invoice.purchase.approve", description: "Aprobar factura de compra", requiresApproval: true },
  { code: "invoice.purchase.reject", description: "Rechazar factura de compra" },
  { code: "invoice.purchase.cancel", description: "Eliminar factura de compra" },

  // Invoice - Credit Note
  { code: "invoice.credit_note.create", description: "Crear nota de crédito" },

  // Accounting - Entry
  { code: "accounting.entry.create", description: "Crear asiento contable" },
  { code: "accounting.entry.close", description: "Cerrar asiento contable" },

  // Accounting - Period
  { code: "accounting.period.close", description: "Cerrar período contable", requiresApproval: true },
  { code: "accounting.period.reopen", description: "Reabrir período contable", requiresApproval: true },

  // Accounting - Tax
  { code: "accounting.retention.calculate", description: "Calcular retenciones" },
  { code: "accounting.perception.calculate", description: "Calcular percepciones" },
  { code: "accounting.depreciation.execute", description: "Ejecutar depreciación" },
  { code: "accounting.tax.iva_position", description: "Posición IVA" },
  { code: "accounting.report.generate", description: "Generar reportes contables", isViewOnly: true },
  { code: "accounting.reconciliation.execute", description: "Ejecutar conciliación" },

  // Maintenance - Work Order
  { code: "maintenance.workorder.create", description: "Crear orden de trabajo" },
  { code: "maintenance.workorder.update", description: "Actualizar orden de trabajo" },
  { code: "maintenance.workorder.complete", description: "Completar orden de trabajo" },
  { code: "maintenance.workorder.assign", description: "Asignar mecánico a orden de trabajo" },
  { code: "maintenance.workorder.view", description: "Ver órdenes de trabajo", isViewOnly: true },

  // Maintenance - Appointment
  { code: "maintenance.appointment.create", description: "Crear turno de mantenimiento" },
  { code: "maintenance.appointment.update", description: "Actualizar turno de mantenimiento" },
  { code: "maintenance.appointment.cancel", description: "Cancelar turno de mantenimiento" },
  { code: "maintenance.appointment.complete", description: "Completar turno de mantenimiento" },
  { code: "maintenance.appointment.view", description: "Ver turnos de mantenimiento", isViewOnly: true },

  // Maintenance - Check-in/out / Plan
  { code: "maintenance.checkin.execute", description: "Ejecutar check-in de moto" },
  { code: "maintenance.checkout.execute", description: "Ejecutar check-out de moto" },
  { code: "maintenance.plan.view", description: "Ver planes de mantenimiento", isViewOnly: true },

  // Inventory - Part
  { code: "inventory.part.create", description: "Crear repuesto" },
  { code: "inventory.part.update", description: "Actualizar repuesto" },
  { code: "inventory.part.delete", description: "Eliminar repuesto" },
  { code: "inventory.part.view", description: "Ver repuestos", isViewOnly: true },
  { code: "inventory.part.adjust_stock", description: "Ajustar stock de repuesto" },
  { code: "inventory.part.import_bulk", description: "Importación masiva de repuestos" },
  { code: "inventory.part.export", description: "Exportar repuestos", isViewOnly: true },

  // Inventory - Movement
  { code: "inventory.movement.create", description: "Registrar movimiento de stock" },
  { code: "inventory.movement.view", description: "Ver movimientos de stock", isViewOnly: true },

  // Inventory - Location
  { code: "inventory.location.create", description: "Crear ubicación de depósito" },
  { code: "inventory.location.update", description: "Actualizar ubicación de depósito" },
  { code: "inventory.location.delete", description: "Eliminar ubicación de depósito" },
  { code: "inventory.location.view", description: "Ver ubicaciones de depósito", isViewOnly: true },

  // Inventory - Purchase Order
  { code: "inventory.purchase_order.create", description: "Crear orden de compra" },
  { code: "inventory.purchase_order.update", description: "Actualizar orden de compra" },
  { code: "inventory.purchase_order.approve", description: "Aprobar orden de compra", requiresApproval: true },
  { code: "inventory.purchase_order.view", description: "Ver órdenes de compra", isViewOnly: true },

  // Inventory - Reception
  { code: "inventory.reception.create", description: "Crear recepción de mercadería" },
  { code: "inventory.reception.process_item", description: "Procesar item de recepción" },
  { code: "inventory.reception.finalize", description: "Finalizar recepción" },
  { code: "inventory.reception.view", description: "Ver recepciones", isViewOnly: true },

  // Import Shipment
  { code: "import_shipment.create", description: "Crear embarque de importación" },
  { code: "import_shipment.update", description: "Actualizar embarque" },
  { code: "import_shipment.view", description: "Ver embarques", isViewOnly: true },
  { code: "import_shipment.calculate_costs", description: "Calcular costos de embarque" },
  { code: "import_shipment.confirm_costs", description: "Confirmar costos de embarque", requiresApproval: true },
  { code: "import_shipment.dispatch.create", description: "Crear despacho aduanero" },
  { code: "import_shipment.dispatch.view", description: "Ver despachos", isViewOnly: true },
  { code: "import_shipment.reception.create", description: "Crear recepción de embarque" },
  { code: "import_shipment.reception.process_item", description: "Procesar item de recepción de embarque" },
  { code: "import_shipment.reception.finalize", description: "Finalizar recepción de embarque" },
  { code: "import_shipment.generate_supplier_link", description: "Generar link para proveedor" },

  // Supplier
  { code: "supplier.create", description: "Crear proveedor" },
  { code: "supplier.update", description: "Actualizar proveedor" },
  { code: "supplier.view", description: "Ver proveedores", isViewOnly: true },
  { code: "supplier.portal.view", description: "Ver portal de proveedor", isViewOnly: true },
  { code: "supplier.portal.confirm", description: "Confirmar desde portal proveedor" },
  { code: "supplier.portal.labels", description: "Gestionar etiquetas de proveedor" },

  // Expense
  { code: "expense.create", description: "Registrar gasto" },
  { code: "expense.update", description: "Actualizar gasto" },
  { code: "expense.view", description: "Ver gastos", isViewOnly: true },

  // Pricing - Rental
  { code: "pricing.rental.view", description: "Ver precios de alquiler", isViewOnly: true },
  { code: "pricing.rental.update", description: "Actualizar precios de alquiler" },

  // Pricing - Parts
  { code: "pricing.parts.view", description: "Ver precios de repuestos", isViewOnly: true },
  { code: "pricing.parts.bulk_update", description: "Actualización masiva de precios" },
  { code: "pricing.parts.apply_suggestion", description: "Aplicar sugerencia de precio" },
  { code: "pricing.parts.list.create", description: "Crear lista de precios" },
  { code: "pricing.parts.list.update", description: "Actualizar lista de precios" },
  { code: "pricing.parts.list.view", description: "Ver listas de precios", isViewOnly: true },
  { code: "pricing.parts.rule_discount.create", description: "Crear regla de descuento" },
  { code: "pricing.parts.rule_discount.view", description: "Ver reglas de descuento", isViewOnly: true },
  { code: "pricing.parts.rule_markup.create", description: "Crear regla de markup" },
  { code: "pricing.parts.rule_markup.view", description: "Ver reglas de markup", isViewOnly: true },
  { code: "pricing.parts.batch.create", description: "Crear lote de actualización de precios" },
  { code: "pricing.parts.batch.view", description: "Ver lotes de actualización", isViewOnly: true },
  { code: "pricing.parts.rollback", description: "Rollback de precios" },
  { code: "pricing.parts.resolve", description: "Resolver conflictos de precios" },
  { code: "pricing.parts.category.create", description: "Crear categoría de precios" },
  { code: "pricing.parts.category.view", description: "Ver categorías de precios", isViewOnly: true },
  { code: "pricing.parts.customer_group.create", description: "Crear grupo de clientes" },
  { code: "pricing.parts.customer_group.view", description: "Ver grupos de clientes", isViewOnly: true },

  // Mechanic
  { code: "mechanic.create", description: "Crear mecánico" },
  { code: "mechanic.update", description: "Actualizar mecánico" },
  { code: "mechanic.view", description: "Ver mecánicos", isViewOnly: true },

  // Workshop
  { code: "workshop.create", description: "Crear taller" },
  { code: "workshop.update", description: "Actualizar taller" },
  { code: "workshop.view", description: "Ver talleres", isViewOnly: true },

  // HR
  { code: "hr.employee.create", description: "Crear empleado" },
  { code: "hr.employee.update", description: "Actualizar empleado" },
  { code: "hr.employee.terminate", description: "Desvincular empleado" },
  { code: "hr.payroll.calculate", description: "Calcular liquidación de sueldos" },
  { code: "hr.payroll.approve", description: "Aprobar liquidación", requiresApproval: true },
  { code: "hr.absence.request", description: "Solicitar ausencia" },
  { code: "hr.absence.approve", description: "Aprobar ausencia" },

  // System
  { code: "system.config.update", description: "Actualizar configuración del sistema" },
  { code: "system.user.create", description: "Crear usuario" },
  { code: "system.user.update", description: "Actualizar usuario" },
  { code: "system.diagnostic.run", description: "Ejecutar diagnóstico del sistema" },
];

function parseCode(code: string): { family: string; entity: string; action: string } {
  const parts = code.split(".");
  if (parts.length === 2) {
    return { family: parts[0], entity: parts[0], action: parts[1] };
  }
  return { family: parts[0], entity: parts[1], action: parts.slice(2).join(".") };
}

// ─── System profiles ─────────────────────────────────────────────────────────

type ProfileDef = {
  name: string;
  description: string;
  grants: Array<{
    pattern: string; // operation code or wildcard like "fleet.*"
    canView?: boolean;
    canCreate?: boolean;
    canExecute?: boolean;
    canApprove?: boolean;
  }>;
};

const SYSTEM_PROFILES: ProfileDef[] = [
  {
    name: "Administrador",
    description: "Acceso completo a todas las operaciones del sistema",
    grants: [
      { pattern: "*", canView: true, canCreate: true, canExecute: true, canApprove: true },
    ],
  },
  {
    name: "Operador Flota",
    description: "Gestión de flota, alquileres, mantenimiento, inventario y pagos",
    grants: [
      { pattern: "fleet.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "rental.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "maintenance.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "payment.*", canView: true, canCreate: true },
      { pattern: "invoice.sale.*", canView: true },
      { pattern: "inventory.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "import_shipment.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "supplier.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "expense.*", canView: true, canCreate: true },
      { pattern: "pricing.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "mechanic.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "workshop.*", canView: true, canCreate: true, canExecute: true },
    ],
  },
  {
    name: "Contador",
    description: "Acceso completo a contabilidad, vista de facturas, pagos, gastos e inventario",
    grants: [
      { pattern: "accounting.*", canView: true, canCreate: true, canExecute: true, canApprove: true },
      { pattern: "invoice.*", canView: true, canApprove: true },
      { pattern: "payment.*", canView: true, canApprove: true },
      { pattern: "inventory.*", canView: true },
      { pattern: "import_shipment.*", canView: true },
      { pattern: "supplier.*", canView: true },
      { pattern: "expense.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "pricing.parts.*", canView: true },
    ],
  },
  {
    name: "RRHH",
    description: "Gestión de recursos humanos y vista de asientos contables",
    grants: [
      { pattern: "hr.*", canView: true, canCreate: true, canExecute: true, canApprove: true },
      { pattern: "accounting.entry.*", canView: true },
    ],
  },
  {
    name: "Comercial",
    description: "Ventas, contratos, clientes, pagos y facturación de ventas",
    grants: [
      { pattern: "rental.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "fleet.*", canView: true },
      { pattern: "payment.*", canView: true, canCreate: true },
      { pattern: "invoice.sale.*", canView: true, canCreate: true, canExecute: true },
    ],
  },
  {
    name: "Mecánico",
    description: "Órdenes de trabajo, turnos, check-in/out, vista de motos y repuestos",
    grants: [
      { pattern: "maintenance.*", canView: true, canCreate: true, canExecute: true },
      { pattern: "fleet.moto.*", canView: true },
      { pattern: "inventory.part.*", canView: true },
      { pattern: "mechanic.*", canView: true },
      { pattern: "workshop.*", canView: true },
    ],
  },
  {
    name: "Cliente",
    description: "Vista de contratos propios, pagos y facturas",
    grants: [
      { pattern: "rental.contract.*", canView: true },
      { pattern: "payment.*", canView: true, canCreate: true },
      { pattern: "invoice.sale.*", canView: true },
    ],
  },
  {
    name: "Auditor",
    description: "Vista de solo lectura de todas las operaciones",
    grants: [
      { pattern: "*", canView: true },
    ],
  },
];

// ─── Role mapping for migration ─────────────────────────────────────────────

const ROLE_TO_PROFILE: Record<string, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador Flota",
  CLIENTE: "Cliente",
  CONTADOR: "Contador",
  RRHH_MANAGER: "RRHH",
  COMERCIAL: "Comercial",
  VIEWER: "Auditor",
};

// ─── Seed function ───────────────────────────────────────────────────────────

function matchPattern(pattern: string, code: string): boolean {
  if (pattern === "*") return true;
  if (pattern === code) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return code.startsWith(prefix + ".");
  }
  return false;
}

export async function seedPermissions() {
  console.log("\n📋 Seeding permissions system...");

  // 1. Create all operations
  console.log("  Creating operations catalog...");
  const operationMap = new Map<string, string>(); // code -> id

  for (const opDef of OPERATION_CATALOG) {
    const { family, entity, action } = parseCode(opDef.code);
    const op = await prisma.operation.upsert({
      where: { code: opDef.code },
      update: {
        description: opDef.description,
        family,
        entity,
        action,
        requiresApproval: opDef.requiresApproval ?? false,
        isViewOnly: opDef.isViewOnly ?? false,
      },
      create: {
        code: opDef.code,
        family,
        entity,
        action,
        description: opDef.description,
        requiresApproval: opDef.requiresApproval ?? false,
        isViewOnly: opDef.isViewOnly ?? false,
      },
    });
    operationMap.set(opDef.code, op.id);
  }
  console.log(`  ✅ ${operationMap.size} operations created/updated`);

  // 2. Create system profiles with grants
  console.log("  Creating permission profiles...");
  const profileMap = new Map<string, string>(); // name -> id

  for (const profileDef of SYSTEM_PROFILES) {
    const profile = await prisma.permissionProfile.upsert({
      where: { name: profileDef.name },
      update: { description: profileDef.description },
      create: {
        name: profileDef.name,
        description: profileDef.description,
        isSystem: true,
      },
    });
    profileMap.set(profileDef.name, profile.id);

    // Delete existing grants and recreate (idempotent)
    await prisma.permissionGrant.deleteMany({
      where: { profileId: profile.id },
    });

    // Expand wildcard patterns into individual operation grants
    for (const grantDef of profileDef.grants) {
      const matchingCodes = [...operationMap.keys()].filter((code) =>
        matchPattern(grantDef.pattern, code)
      );

      for (const code of matchingCodes) {
        const opId = operationMap.get(code)!;
        await prisma.permissionGrant.create({
          data: {
            profileId: profile.id,
            operationId: opId,
            canView: grantDef.canView ?? false,
            canCreate: grantDef.canCreate ?? false,
            canExecute: grantDef.canExecute ?? false,
            canApprove: grantDef.canApprove ?? false,
          },
        });
      }
    }

    const grantCount = await prisma.permissionGrant.count({
      where: { profileId: profile.id },
    });
    console.log(`  ✅ "${profileDef.name}": ${grantCount} grants`);
  }

  // 3. Migrate existing users based on their legacy role
  console.log("  Migrating existing users to permission profiles...");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });

  let migrated = 0;
  for (const user of users) {
    const profileName = ROLE_TO_PROFILE[user.role];
    if (!profileName) continue;

    const profileId = profileMap.get(profileName);
    if (!profileId) continue;

    await prisma.userProfile.upsert({
      where: {
        userId_profileId: { userId: user.id, profileId },
      },
      update: {},
      create: {
        userId: user.id,
        profileId,
        assignedBy: "system-migration",
      },
    });
    migrated++;
  }
  console.log(`  ✅ ${migrated} users migrated to permission profiles`);

  console.log("📋 Permissions system seeded!\n");
}

// Run standalone if called directly
if (require.main === module) {
  seedPermissions()
    .catch((e) => {
      console.error("Seed permissions error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
