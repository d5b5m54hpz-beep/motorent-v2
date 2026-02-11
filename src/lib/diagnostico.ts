import { prisma } from "@/lib/prisma";

export type CheckStatus = "passed" | "warning" | "error";

export type DiagnosticoCheck = {
  categoria: string;
  nombre: string;
  status: CheckStatus;
  mensaje?: string;
  detalles?: string[];
  tiempo?: number; // ms
  ids?: string[]; // IDs afectados si hay inconsistencias
};

export type DiagnosticoProgress = {
  progress: number;
  total: number;
  current: string;
  status: "running" | "done" | "error";
  results?: DiagnosticoCheck[];
};

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 1: APIs
// ═══════════════════════════════════════════════════════════════════════════

const API_ENDPOINTS = [
  "/api/dashboard",
  "/api/motos",
  "/api/clientes",
  "/api/contratos",
  "/api/pagos",
  "/api/facturas",
  "/api/facturas-compra",
  "/api/gastos",
  "/api/mantenimientos",
  "/api/proveedores",
  "/api/repuestos",
  "/api/presupuestos",
  "/api/pricing",
  "/api/pricing-config",
  "/api/cuentas-contables",
  "/api/asientos-contables",
  "/api/contabilidad/reportes",
  "/api/rrhh/empleados",
  "/api/rrhh/stats",
  "/api/rrhh/ausencias",
  "/api/rrhh/recibos",
  "/api/finanzas/resumen",
  "/api/finanzas/rentabilidad",
  "/api/finanzas/pricing",
  "/api/usuarios",
  "/api/alertas",
  "/api/configuracion/empresa",
  "/api/ai/chat",
];

export async function verificarAPIs(
  baseUrl: string,
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];
  const total = API_ENDPOINTS.length;

  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i];
    const inicio = Date.now();

    onProgress?.(i + 1, `Verificando ${endpoint}...`);

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const tiempo = Date.now() - inicio;

      if (res.status === 200 || res.status === 401) {
        // 401 es OK (sin auth)
        checks.push({
          categoria: "APIs",
          nombre: `GET ${endpoint}`,
          status: "passed",
          mensaje: `${res.status} OK (${tiempo}ms)`,
          tiempo,
        });
      } else if (res.status === 404) {
        checks.push({
          categoria: "APIs",
          nombre: `GET ${endpoint}`,
          status: "error",
          mensaje: `404 Not Found`,
          tiempo,
        });
      } else if (res.status >= 500) {
        const error = await res.text().catch(() => "Unknown error");
        checks.push({
          categoria: "APIs",
          nombre: `GET ${endpoint}`,
          status: "error",
          mensaje: `${res.status} Server Error`,
          detalles: [error.substring(0, 200)],
          tiempo,
        });
      } else {
        checks.push({
          categoria: "APIs",
          nombre: `GET ${endpoint}`,
          status: "warning",
          mensaje: `${res.status} ${res.statusText}`,
          tiempo,
        });
      }
    } catch (err) {
      const tiempo = Date.now() - inicio;
      checks.push({
        categoria: "APIs",
        nombre: `GET ${endpoint}`,
        status: "error",
        mensaje: `Error de conexión`,
        detalles: [err instanceof Error ? err.message : String(err)],
        tiempo,
      });
    }
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 2: Páginas
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_PAGES = [
  "/admin",
  "/admin/motos",
  "/admin/clientes",
  "/admin/contratos",
  "/admin/pagos",
  "/admin/facturas",
  "/admin/facturas-compra",
  "/admin/cuentas-contables",
  "/admin/asientos-contables",
  "/admin/contabilidad/reportes",
  "/admin/gastos",
  "/admin/mantenimientos",
  "/admin/proveedores",
  "/admin/repuestos",
  "/admin/presupuestos",
  "/admin/pricing",
  "/admin/precios",
  "/admin/finanzas",
  "/admin/finanzas/rentabilidad",
  "/admin/finanzas/pricing",
  "/admin/rrhh",
  "/admin/rrhh/empleados",
  "/admin/rrhh/ausencias",
  "/admin/rrhh/liquidacion",
  "/admin/usuarios",
  "/admin/alertas",
  "/admin/asistente",
  "/admin/configuracion/empresa",
  "/admin/sistema/diagnostico",
];

export async function verificarPaginas(
  baseUrl: string,
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];

  for (let i = 0; i < ADMIN_PAGES.length; i++) {
    const page = ADMIN_PAGES[i];
    const inicio = Date.now();

    onProgress?.(i + 1, `Verificando página ${page}...`);

    try {
      const res = await fetch(`${baseUrl}${page}`, {
        method: "HEAD",
        redirect: "manual",
      });

      const tiempo = Date.now() - inicio;

      // 200, 307 (redirect a login) son OK
      if (res.status === 200 || res.status === 307 || res.status === 302) {
        checks.push({
          categoria: "Páginas",
          nombre: page,
          status: "passed",
          mensaje: `${res.status} (${tiempo}ms)`,
          tiempo,
        });
      } else if (res.status === 404) {
        checks.push({
          categoria: "Páginas",
          nombre: page,
          status: "error",
          mensaje: "404 - Página no existe",
          tiempo,
        });
      } else {
        checks.push({
          categoria: "Páginas",
          nombre: page,
          status: "warning",
          mensaje: `${res.status} ${res.statusText}`,
          tiempo,
        });
      }
    } catch (err) {
      const tiempo = Date.now() - inicio;
      checks.push({
        categoria: "Páginas",
        nombre: page,
        status: "error",
        mensaje: "Error de conexión",
        detalles: [err instanceof Error ? err.message : String(err)],
        tiempo,
      });
    }
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 3: Base de Datos (integridad)
// ═══════════════════════════════════════════════════════════════════════════

export async function verificarIntegridad(
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];

  // 1. Contratos activos (todos tienen moto obligatoria)
  onProgress?.(1, "Verificando contratos activos...");
  const contratosActivos = await prisma.contrato.count({
    where: { estado: { in: ["activo", "vencido"] } },
  });

  checks.push({
    categoria: "Base de Datos",
    nombre: "Contratos activos",
    status: "passed",
    mensaje: `${contratosActivos} contratos activos (motoId es requerido)`,
  });

  // 2. Contratos activos con moto DISPONIBLE
  onProgress?.(2, "Verificando inconsistencia moto-contrato...");
  const contratosInconsistentes = await prisma.contrato.findMany({
    where: {
      estado: "activo",
      moto: { estado: "disponible" },
    },
    select: { id: true, motoId: true },
  });

  if (contratosInconsistentes.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Contratos activos con moto DISPONIBLE",
      status: "error",
      mensaje: `${contratosInconsistentes.length} inconsistencias`,
      detalles: ["La moto debería estar en estado ALQUILADA"],
      ids: contratosInconsistentes.map((c) => c.id.substring(0, 8)),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Contratos activos con moto DISPONIBLE",
      status: "passed",
    });
  }

  // 3. Motos ALQUILADA sin contrato activo
  onProgress?.(3, "Verificando motos alquiladas...");
  const motosHuerfanas = await prisma.moto.findMany({
    where: {
      estado: "alquilada",
      contratos: {
        none: { estado: "activo" },
      },
    },
    select: { id: true, patente: true },
  });

  if (motosHuerfanas.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Motos ALQUILADA sin contrato activo",
      status: "error",
      mensaje: `${motosHuerfanas.length} motos huérfanas`,
      ids: motosHuerfanas.map((m) => m.patente),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Motos ALQUILADA sin contrato activo",
      status: "passed",
    });
  }

  // 4. Pagos totales (contratoId es requerido)
  onProgress?.(4, "Verificando pagos...");
  const totalPagos = await prisma.pago.count();

  checks.push({
    categoria: "Base de Datos",
    nombre: "Pagos registrados",
    status: "passed",
    mensaje: `${totalPagos} pagos (contratoId es requerido)`,
  });

  // 5. Facturas emitidas
  onProgress?.(5, "Verificando facturas...");
  const totalFacturas = await prisma.factura.count();
  const facturasEmitidas = await prisma.factura.count({
    where: { emitida: true },
  });

  checks.push({
    categoria: "Base de Datos",
    nombre: "Facturas emitidas",
    status: "passed",
    mensaje: `${facturasEmitidas}/${totalFacturas} emitidas con CAE`,
  });

  // 6. Facturas de compra sin proveedor
  onProgress?.(6, "Verificando facturas de compra...");
  const facturasCompraSinProveedor = await prisma.facturaCompra.findMany({
    where: { proveedorId: null },
    select: { id: true, visibleId: true },
  });

  if (facturasCompraSinProveedor.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Facturas de compra sin proveedor",
      status: "warning",
      mensaje: `${facturasCompraSinProveedor.length} facturas sin proveedor (puede ser válido)`,
      ids: facturasCompraSinProveedor.map((f) => f.visibleId),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Facturas de compra sin proveedor",
      status: "passed",
    });
  }

  // 7. Empleados activos
  onProgress?.(7, "Verificando empleados...");
  const empleadosActivos = await prisma.empleado.count({
    where: { estado: "ACTIVO" },
  });
  const totalEmpleados = await prisma.empleado.count();

  checks.push({
    categoria: "Base de Datos",
    nombre: "Empleados registrados",
    status: "passed",
    mensaje: `${empleadosActivos}/${totalEmpleados} activos`,
  });

  // 8. Asientos contables desbalanceados
  onProgress?.(8, "Verificando asientos contables...");
  const asientos = await prisma.asientoContable.findMany({
    where: { cerrado: true },
    select: { id: true, visibleId: true, totalDebe: true, totalHaber: true },
  });

  const asientosDesbalanceados = asientos.filter(
    (a) => Math.abs(a.totalDebe - a.totalHaber) > 0.01
  );

  if (asientosDesbalanceados.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Asientos contables desbalanceados",
      status: "error",
      mensaje: `${asientosDesbalanceados.length} asientos con debe ≠ haber`,
      ids: asientosDesbalanceados.map((a) => a.visibleId),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Asientos contables desbalanceados",
      status: "passed",
    });
  }

  // 9. Cuentas contables con código duplicado
  onProgress?.(9, "Verificando plan de cuentas...");
  const cuentas = await prisma.cuentaContable.groupBy({
    by: ["codigo"],
    _count: { codigo: true },
    having: { codigo: { _count: { gt: 1 } } },
  });

  if (cuentas.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Cuentas contables duplicadas",
      status: "error",
      mensaje: `${cuentas.length} códigos duplicados`,
      ids: cuentas.map((c) => c.codigo),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Cuentas contables duplicadas",
      status: "passed",
    });
  }

  // 10. Usuarios por rol
  onProgress?.(10, "Verificando usuarios...");
  const totalUsuarios = await prisma.user.count();
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });

  checks.push({
    categoria: "Base de Datos",
    nombre: "Usuarios registrados",
    status: "passed",
    mensaje: `${totalUsuarios} usuarios (${admins} ADMIN, role tiene default)`,
  });

  // 11. Gastos registrados
  onProgress?.(11, "Verificando gastos...");
  const totalGastos = await prisma.gasto.count();

  checks.push({
    categoria: "Base de Datos",
    nombre: "Gastos registrados",
    status: "passed",
    mensaje: `${totalGastos} gastos (categoría es requerida)`,
  });

  // 12. Mantenimientos pendientes vencidos
  onProgress?.(12, "Verificando mantenimientos...");
  const ahora = new Date();
  const mantenimientosVencidos = await prisma.mantenimiento.findMany({
    where: {
      estado: "PENDIENTE",
      fechaProgramada: { lt: ahora },
    },
    select: { id: true, visibleId: true, fechaProgramada: true },
  });

  if (mantenimientosVencidos.length > 0) {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Mantenimientos PENDIENTE vencidos",
      status: "warning",
      mensaje: `${mantenimientosVencidos.length} mantenimientos con fecha pasada`,
      ids: mantenimientosVencidos.map((m) => m.visibleId),
    });
  } else {
    checks.push({
      categoria: "Base de Datos",
      nombre: "Mantenimientos PENDIENTE vencidos",
      status: "passed",
    });
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 4: CRUD (verificar endpoints)
// ═══════════════════════════════════════════════════════════════════════════

const CRUD_MODULES = [
  { name: "Motos", endpoint: "/api/motos" },
  { name: "Clientes", endpoint: "/api/clientes" },
  { name: "Contratos", endpoint: "/api/contratos" },
  { name: "Pagos", endpoint: "/api/pagos" },
  { name: "Facturas", endpoint: "/api/facturas" },
  { name: "Facturas Compra", endpoint: "/api/facturas-compra" },
  { name: "Gastos", endpoint: "/api/gastos" },
  { name: "Mantenimientos", endpoint: "/api/mantenimientos" },
  { name: "Proveedores", endpoint: "/api/proveedores" },
  { name: "Repuestos", endpoint: "/api/repuestos" },
  { name: "Presupuestos", endpoint: "/api/presupuestos" },
  { name: "Cuentas Contables", endpoint: "/api/cuentas-contables" },
  { name: "Asientos Contables", endpoint: "/api/asientos-contables" },
  { name: "Empleados", endpoint: "/api/rrhh/empleados" },
  { name: "Ausencias", endpoint: "/api/rrhh/ausencias" },
  { name: "Usuarios", endpoint: "/api/usuarios" },
];

export async function verificarCRUD(
  baseUrl: string,
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];

  for (let i = 0; i < CRUD_MODULES.length; i++) {
    const module = CRUD_MODULES[i];
    onProgress?.(i + 1, `Verificando CRUD ${module.name}...`);

    try {
      const res = await fetch(`${baseUrl}${module.endpoint}`, {
        method: "OPTIONS",
      });

      const allowHeader = res.headers.get("Allow") || "";
      const methods = allowHeader.split(",").map((m) => m.trim());

      const tieneGET = methods.includes("GET") || methods.includes("*");
      const tienePOST = methods.includes("POST") || methods.includes("*");

      // Verificar endpoint [id]
      const resId = await fetch(`${baseUrl}${module.endpoint}/test-id`, {
        method: "OPTIONS",
      });
      const allowHeaderId = resId.headers.get("Allow") || "";
      const methodsId = allowHeaderId.split(",").map((m) => m.trim());

      const tienePUT = methodsId.includes("PUT") || methodsId.includes("*");
      const tieneDELETE =
        methodsId.includes("DELETE") || methodsId.includes("*");

      const operaciones: string[] = [];
      if (tieneGET) operaciones.push("Leer");
      if (tienePOST) operaciones.push("Crear");
      if (tienePUT) operaciones.push("Editar");
      if (tieneDELETE) operaciones.push("Eliminar");

      if (operaciones.length === 4) {
        checks.push({
          categoria: "CRUD",
          nombre: module.name,
          status: "passed",
          mensaje: "CRUD completo",
          detalles: operaciones,
        });
      } else {
        checks.push({
          categoria: "CRUD",
          nombre: module.name,
          status: "warning",
          mensaje: `Operaciones disponibles: ${operaciones.join(", ")}`,
          detalles: operaciones,
        });
      }
    } catch (err) {
      checks.push({
        categoria: "CRUD",
        nombre: module.name,
        status: "error",
        mensaje: "Error verificando CRUD",
        detalles: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 5: Configuración y Seguridad
// ═══════════════════════════════════════════════════════════════════════════

export async function verificarConfiguracion(
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];

  // 1. Variables de entorno
  onProgress?.(1, "Verificando variables de entorno...");
  const envVars = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "ANTHROPIC_API_KEY",
    "MERCADOPAGO_ACCESS_TOKEN",
    "RESEND_API_KEY",
  ];

  const envFaltantes: string[] = [];
  envVars.forEach((varName) => {
    if (!process.env[varName]) {
      envFaltantes.push(varName);
    }
  });

  if (envFaltantes.length > 0) {
    checks.push({
      categoria: "Configuración",
      nombre: "Variables de entorno",
      status: "warning",
      mensaje: `${envFaltantes.length} variables faltantes`,
      detalles: envFaltantes,
    });
  } else {
    checks.push({
      categoria: "Configuración",
      nombre: "Variables de entorno",
      status: "passed",
      mensaje: "Todas las variables configuradas",
    });
  }

  // 2. ConfiguracionEmpresa
  onProgress?.(2, "Verificando configuración de empresa...");
  const empresa = await prisma.configuracionEmpresa.findUnique({
    where: { id: "default" },
  });

  if (!empresa) {
    checks.push({
      categoria: "Configuración",
      nombre: "Configuración Empresa",
      status: "error",
      mensaje: "No existe configuración de empresa",
    });
  } else {
    const problemas: string[] = [];
    if (!empresa.cuit) problemas.push("Sin CUIT");
    if (!empresa.razonSocial) problemas.push("Sin razón social");
    if (!empresa.condicionIva) problemas.push("Sin condición IVA");

    if (problemas.length > 0) {
      checks.push({
        categoria: "Configuración",
        nombre: "Configuración Empresa",
        status: "warning",
        mensaje: problemas.join(", "),
        detalles: problemas,
      });
    } else {
      checks.push({
        categoria: "Configuración",
        nombre: "Configuración Empresa",
        status: "passed",
        mensaje: "Configuración completa",
      });
    }
  }

  // 3. Usuario ADMIN
  onProgress?.(3, "Verificando usuarios administradores...");
  const admins = await prisma.user.count({
    where: { role: "ADMIN" },
  });

  if (admins === 0) {
    checks.push({
      categoria: "Configuración",
      nombre: "Usuarios ADMIN",
      status: "error",
      mensaje: "No hay usuarios ADMIN en el sistema",
    });
  } else {
    checks.push({
      categoria: "Configuración",
      nombre: "Usuarios ADMIN",
      status: "passed",
      mensaje: `${admins} administrador(es)`,
    });
  }

  // 4. Plan de cuentas
  onProgress?.(4, "Verificando plan de cuentas...");
  const cuentas = await prisma.cuentaContable.count();

  if (cuentas === 0) {
    checks.push({
      categoria: "Configuración",
      nombre: "Plan de cuentas",
      status: "warning",
      mensaje: "No hay cuentas contables cargadas",
    });
  } else {
    checks.push({
      categoria: "Configuración",
      nombre: "Plan de cuentas",
      status: "passed",
      mensaje: `${cuentas} cuentas definidas`,
    });
  }

  // 5. Períodos contables
  onProgress?.(5, "Verificando períodos contables...");
  const periodos = await prisma.periodoContable.count();

  checks.push({
    categoria: "Configuración",
    nombre: "Períodos contables",
    status: periodos > 0 ? "passed" : "warning",
    mensaje:
      periodos > 0
        ? `${periodos} períodos definidos`
        : "No hay períodos contables",
  });

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORÍA 6: AI Assistant
// ═══════════════════════════════════════════════════════════════════════════

export async function verificarAI(
  baseUrl: string,
  onProgress?: (progress: number, current: string) => void
): Promise<DiagnosticoCheck[]> {
  const checks: DiagnosticoCheck[] = [];

  // 1. Endpoint /api/ai/chat
  onProgress?.(1, "Verificando AI endpoint...");
  try {
    const res = await fetch(`${baseUrl}/api/ai/chat`, {
      method: "OPTIONS",
    });

    if (res.ok) {
      checks.push({
        categoria: "AI Assistant",
        nombre: "Endpoint /api/ai/chat",
        status: "passed",
        mensaje: "Endpoint disponible",
      });
    } else {
      checks.push({
        categoria: "AI Assistant",
        nombre: "Endpoint /api/ai/chat",
        status: "error",
        mensaje: `${res.status} ${res.statusText}`,
      });
    }
  } catch (err) {
    checks.push({
      categoria: "AI Assistant",
      nombre: "Endpoint /api/ai/chat",
      status: "error",
      mensaje: "Error de conexión",
      detalles: [err instanceof Error ? err.message : String(err)],
    });
  }

  // 2. ANTHROPIC_API_KEY
  onProgress?.(2, "Verificando API key de Anthropic...");
  if (process.env.ANTHROPIC_API_KEY) {
    checks.push({
      categoria: "AI Assistant",
      nombre: "ANTHROPIC_API_KEY",
      status: "passed",
      mensaje: "Configurada",
    });
  } else {
    checks.push({
      categoria: "AI Assistant",
      nombre: "ANTHROPIC_API_KEY",
      status: "error",
      mensaje: "No configurada",
    });
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// Función principal
// ═══════════════════════════════════════════════════════════════════════════

export async function ejecutarDiagnosticoCompleto(
  baseUrl: string,
  onProgress?: (data: DiagnosticoProgress) => void
): Promise<{
  checks: DiagnosticoCheck[];
  totalChecks: number;
  passed: number;
  warnings: number;
  errors: number;
  duracion: number;
}> {
  const inicio = Date.now();
  const allChecks: DiagnosticoCheck[] = [];

  let totalEstimado = 100; // estimación inicial
  let current = 0;

  // CATEGORÍA 1: APIs
  const checksAPIs = await verificarAPIs(baseUrl, (progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksAPIs);
  current += API_ENDPOINTS.length;

  // CATEGORÍA 2: Páginas
  const checksPaginas = await verificarPaginas(baseUrl, (progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksPaginas);
  current += ADMIN_PAGES.length;

  // CATEGORÍA 3: Integridad DB
  const checksIntegridad = await verificarIntegridad((progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksIntegridad);
  current += 12;

  // CATEGORÍA 4: CRUD
  const checksCRUD = await verificarCRUD(baseUrl, (progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksCRUD);
  current += CRUD_MODULES.length;

  // CATEGORÍA 5: Configuración
  const checksConfig = await verificarConfiguracion((progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksConfig);
  current += 5;

  // CATEGORÍA 6: AI
  const checksAI = await verificarAI(baseUrl, (progress, mensaje) => {
    onProgress?.({
      progress: Math.floor(((current + progress) / totalEstimado) * 100),
      total: totalEstimado,
      current: mensaje,
      status: "running",
    });
  });
  allChecks.push(...checksAI);
  current += 2;

  // Calcular totales
  const passed = allChecks.filter((c) => c.status === "passed").length;
  const warnings = allChecks.filter((c) => c.status === "warning").length;
  const errors = allChecks.filter((c) => c.status === "error").length;
  const duracion = Math.floor((Date.now() - inicio) / 1000);

  onProgress?.({
    progress: 100,
    total: allChecks.length,
    current: "Diagnóstico completo",
    status: "done",
    results: allChecks,
  });

  return {
    checks: allChecks,
    totalChecks: allChecks.length,
    passed,
    warnings,
    errors,
    duracion,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Calcular nota
// ═══════════════════════════════════════════════════════════════════════════

export function calcularNota(
  passed: number,
  warnings: number,
  errors: number
): string {
  const total = passed + warnings + errors;
  if (total === 0) return "N/A";

  const porcentaje = (passed / total) * 100;

  if (porcentaje >= 97) return "A+";
  if (porcentaje >= 93) return "A";
  if (porcentaje >= 90) return "A-";
  if (porcentaje >= 87) return "B+";
  if (porcentaje >= 83) return "B";
  if (porcentaje >= 80) return "B-";
  if (porcentaje >= 77) return "C+";
  if (porcentaje >= 73) return "C";
  if (porcentaje >= 70) return "C-";
  if (porcentaje >= 67) return "D+";
  if (porcentaje >= 60) return "D";
  return "F";
}

// ═══════════════════════════════════════════════════════════════════════════
// Generar reporte de texto
// ═══════════════════════════════════════════════════════════════════════════

export function generarReporteTexto(
  checks: DiagnosticoCheck[],
  passed: number,
  warnings: number,
  errors: number
): string {
  const nota = calcularNota(passed, warnings, errors);
  const fecha = new Date().toLocaleString("es-AR");
  const total = passed + warnings + errors;
  const porcentaje = Math.round((passed / total) * 100);

  let reporte = `═══════════════════════════════════════════════════════════════════
REPORTE DE DIAGNÓSTICO MOTOLIBRE - ${fecha}
Nota: ${nota} (${porcentaje}% OK)
═══════════════════════════════════════════════════════════════════

RESUMEN:
- Total de verificaciones: ${total}
- ✅ Pasaron: ${passed}
- ⚠️ Warnings: ${warnings}
- ❌ Errores: ${errors}

`;

  // ERRORES (requieren fix)
  const checksConError = checks.filter((c) => c.status === "error");
  if (checksConError.length > 0) {
    reporte += `\nERRORES (requieren fix inmediato):\n`;
    checksConError.forEach((check, i) => {
      reporte += `${i + 1}. ❌ [${check.categoria}] ${check.nombre}\n`;
      reporte += `   ${check.mensaje}\n`;
      if (check.detalles && check.detalles.length > 0) {
        check.detalles.forEach((d) => {
          reporte += `   - ${d}\n`;
        });
      }
      if (check.ids && check.ids.length > 0) {
        reporte += `   IDs afectados: ${check.ids.slice(0, 5).join(", ")}${check.ids.length > 5 ? "..." : ""}\n`;
      }
      reporte += "\n";
    });
  }

  // WARNINGS (revisar)
  const checksConWarning = checks.filter((c) => c.status === "warning");
  if (checksConWarning.length > 0) {
    reporte += `\nWARNINGS (revisar cuando sea posible):\n`;
    checksConWarning.forEach((check, i) => {
      reporte += `${i + 1}. ⚠️ [${check.categoria}] ${check.nombre}\n`;
      reporte += `   ${check.mensaje}\n`;
      if (check.detalles && check.detalles.length > 0) {
        check.detalles.forEach((d) => {
          reporte += `   - ${d}\n`;
        });
      }
      if (check.ids && check.ids.length > 0) {
        reporte += `   IDs afectados: ${check.ids.slice(0, 5).join(", ")}${check.ids.length > 5 ? "..." : ""}\n`;
      }
      reporte += "\n";
    });
  }

  // ACCIONES REQUERIDAS
  if (checksConError.length > 0) {
    reporte += `\nACCIONES REQUERIDAS:\n`;
    checksConError.slice(0, 5).forEach((check) => {
      reporte += `- Fix: [${check.categoria}] ${check.nombre} - ${check.mensaje}\n`;
    });
  }

  reporte += `\n═══════════════════════════════════════════════════════════════════\n`;

  return reporte;
}
