-- Primero agregamos los nuevos valores al enum
ALTER TYPE "EstadoFacturaCompra" ADD VALUE IF NOT EXISTS 'BORRADOR';
ALTER TYPE "EstadoFacturaCompra" ADD VALUE IF NOT EXISTS 'PENDIENTE_REVISION';
ALTER TYPE "EstadoFacturaCompra" ADD VALUE IF NOT EXISTS 'APROBADA';
ALTER TYPE "EstadoFacturaCompra" ADD VALUE IF NOT EXISTS 'RECHAZADA';

-- Actualizamos los registros existentes
UPDATE "FacturaCompra" SET estado = 'BORRADOR' WHERE estado = 'PENDIENTE';

-- Nota: No podemos eliminar 'PENDIENTE' del enum en PostgreSQL de forma directa
-- pero Prisma manejará esto en el próximo db push
