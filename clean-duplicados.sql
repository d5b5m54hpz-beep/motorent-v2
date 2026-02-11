-- Buscar duplicados
SELECT cuit, tipo, "puntoVenta", numero, COUNT(*) as cantidad
FROM "FacturaCompra"
WHERE cuit IS NOT NULL AND "puntoVenta" IS NOT NULL
GROUP BY cuit, tipo, "puntoVenta", numero
HAVING COUNT(*) > 1;

-- Para cada duplicado, mantener solo el más reciente y marcar los otros como ANULADA
WITH duplicados AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY cuit, tipo, "puntoVenta", numero 
      ORDER BY "createdAt" DESC
    ) as rn
  FROM "FacturaCompra"
  WHERE cuit IS NOT NULL AND "puntoVenta" IS NOT NULL
)
UPDATE "FacturaCompra" 
SET estado = 'ANULADA', 
    notas = COALESCE(notas || ' | ', '') || 'DUPLICADO - Anulado automáticamente por control de duplicidad'
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);
