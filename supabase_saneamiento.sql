-- =====================================================
-- SENTINEL - Plan de Saneamiento Multi-Tenant
-- Ejecutar en orden en SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- PASO 1: Verificar dependencias de universidades
-- =====================================================

-- Revisar si universidades tiene datos
SELECT COUNT(*) as total_universidades FROM universidades;

-- Revisar si hay foreign keys hacia universidades
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'universidades';

-- =====================================================
-- PASO 2: Migrar direcciones → facultades (si aplica)
-- =====================================================

-- Opción A: Si direcciones existe y facultades NO existe
-- Copiar datos y renombrar
/*
BEGIN;
-- Copiar estructura y datos
CREATE TABLE facultades AS TABLE direcciones WITH DATA;
-- Añadir columna si no existe
ALTER TABLE facultades ADD COLUMN IF NOT EXISTS id_organizacion uuid;
-- Añadir constraint si no existe
ALTER TABLE facultades ADD CONSTRAINT facultades_id_org_fk 
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
-- Eliminar tabla antigua
DROP TABLE direcciones;
COMMIT;
*/

-- =====================================================
-- PASO 3: Asegurar que facultades tiene id_organizacion
-- =====================================================

-- Verificar estructura actual de facultades
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'facultades'
ORDER BY ordinal_position;

-- Añadir id_organizacion si no existe
ALTER TABLE facultades 
ADD COLUMN IF NOT EXISTS id_organizacion uuid;

-- Añadir constraint FK (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'facultades_id_organizacion_fkey'
    ) THEN
        ALTER TABLE facultades 
        ADD CONSTRAINT facultades_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- PASO 4: Eliminar tabla universidades (si no tiene dependencias)
-- =====================================================

-- Verificar primero si hay datos
DO $$
DECLARE
    uni_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO uni_count FROM universidades;
    IF uni_count = 0 THEN
        DROP TABLE IF EXISTS universidades;
        RAISE NOTICE 'Tabla universidades eliminada (sin datos)';
    ELSE
        RAISE NOTICE 'Tabla universidades tiene % registros. Revisar antes de eliminar.', uni_count;
    END IF;
END $$;

-- =====================================================
-- PASO 5: Asegurar id_organizacion en TODAS las tablas
-- =====================================================

-- sedes
ALTER TABLE sedes ADD COLUMN IF NOT EXISTS id_organizacion uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sedes_id_organizacion_fkey'
    ) THEN
        ALTER TABLE sedes 
        ADD CONSTRAINT sedes_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- carreras
ALTER TABLE carreras ADD COLUMN IF NOT EXISTS id_organizacion uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'carreras_id_organizacion_fkey'
    ) THEN
        ALTER TABLE carreras 
        ADD CONSTRAINT carreras_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- modalidades
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS id_organizacion uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'modalidades_id_organizacion_fkey'
    ) THEN
        ALTER TABLE modalidades 
        ADD CONSTRAINT modalidades_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- grupos_clase (asegurarse que tiene id_organizacion)
ALTER TABLE grupos_clase ADD COLUMN IF NOT EXISTS id_organizacion uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'grupos_clase_id_organizacion_fkey'
    ) THEN
        ALTER TABLE grupos_clase 
        ADD CONSTRAINT grupos_clase_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- estudiantes (asegurarse que tiene id_organizacion)
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS id_organizacion uuid;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'estudiantes_id_organizacion_fkey'
    ) THEN
        ALTER TABLE estudiantes 
        ADD CONSTRAINT estudiantes_id_organizacion_fkey 
        FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- PASO 6: Poblar id_organizacion en tablas existentes
-- =====================================================

-- Para estudiantes: vincularlos a través de sus matrículas → grupos → organización
UPDATE estudiantes e
SET id_organizacion = gg.id_organizacion
FROM matriculas m
JOIN grupos_clase gg ON m.id_grupo = gg.id
WHERE m.id_estudiante = e.id
AND e.id_organizacion IS NULL;

-- Para grupos_clase: vincularlos a través de carreras → organización
UPDATE grupos_clase gc
SET id_organizacion = c.id_organizacion
FROM carreras c
WHERE gc.id_carrera = c.id
AND gc.id_organizacion IS NULL;

-- Para sedes, carreras, modalidades: poblar desde la organización del perfil del creador
-- (Esto requiere datos específicos de tu implementación)

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las tablas tienen la columna id_organizacion
SELECT 'sedes' as tabla, COUNT(*) as total, COUNT(*) FILTER (WHERE id_organizacion IS NULL) as sin_org FROM sedes
UNION ALL
SELECT 'facultades', COUNT(*), COUNT(*) FILTER (WHERE id_organizacion IS NULL) FROM facultades
UNION ALL
SELECT 'carreras', COUNT(*), COUNT(*) FILTER (WHERE id_organizacion IS NULL) FROM carreras
UNION ALL
SELECT 'modalidades', COUNT(*), COUNT(*) FILTER (WHERE id_organizacion IS NULL) FROM modalidades
UNION ALL
SELECT 'grupos_clase', COUNT(*), COUNT(*) FILTER (WHERE id_organizacion IS NULL) FROM grupos_clase
UNION ALL
SELECT 'estudiantes', COUNT(*), COUNT(*) FILTER (WHERE id_organizacion IS NULL) FROM estudiantes;

-- Listar tablas después del saneamiento
SELECT 
    t.table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
