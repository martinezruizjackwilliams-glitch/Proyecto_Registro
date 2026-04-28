-- ============================================================
-- FIX: Esquema de Facultades y Carreras
-- Problema: carreras tiene id_direcciones (viejo) en lugar de id_facultad
-- ============================================================

-- 1. Verificar estructura actual
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'carreras';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'facultades';

-- 2. Agregar columna id_facultad a carreras si no existe
ALTER TABLE carreras ADD COLUMN IF NOT EXISTS id_facultad UUID;

-- 3. Agregar FK a facultades (si la tabla tiene la columna correcta)
-- Primero verificamos si facultades tiene las columnas correctas
DO $$ 
BEGIN
    -- Agregar id_organizacion a facultades si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facultades' AND column_name = 'id_organizacion') THEN
        ALTER TABLE facultades ADD COLUMN id_organizacion UUID;
    END IF;
    
    -- Agregar id_direccion a facultades si no existe (por si acaso)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'facultades' AND column_name = 'id_direccion') THEN
        ALTER TABLE facultades ADD COLUMN id_direccion UUID;
    END IF;
END $$;

-- 4. Crear FK de carreras a facultades
ALTER TABLE carreras DROP CONSTRAINT IF EXISTS fk_carreras_facultad;
ALTER TABLE carreras 
    ADD CONSTRAINT fk_carreras_facultad 
    FOREIGN KEY (id_facultad) 
    REFERENCES facultades(id) 
    ON DELETE SET NULL;

-- 5. Crear FK de facultades a organizaciones
ALTER TABLE facultades DROP CONSTRAINT IF EXISTS fk_facultades_org;
ALTER TABLE facultades 
    ADD CONSTRAINT fk_facultades_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- 6. Migrar datos existentes de id_direcciones a facultades
-- Esto asume que las direcciones viejas tenían una relación con facultades
-- Si hay datos en id_direcciones, necesitas migrarlos manualmente o limpiar

-- 7. Limpiar columna id_direcciones de carreras (opcional - solo si ya migraste los datos)
-- ALTER TABLE carreras DROP COLUMN IF EXISTS id_direcciones;

-- ============================================================
-- RLS para facultades
-- ============================================================
ALTER TABLE facultades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facultades_select" ON facultades;
DROP POLICY IF EXISTS "facultades_insert" ON facultades;
DROP POLICY IF EXISTS "facultades_update" ON facultades;
DROP POLICY IF EXISTS "facultades_delete" ON facultades;

CREATE POLICY "facultades_select" ON facultades
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "facultades_insert" ON facultades
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "facultades_update" ON facultades
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "facultades_delete" ON facultades
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS para carreras (actualizar para usar id_facultad)
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carreras_select" ON carreras;
DROP POLICY IF EXISTS "carreras_insert" ON carreras;
DROP POLICY IF EXISTS "carreras_update" ON carreras;
DROP POLICY IF EXISTS "carreras_delete" ON carreras;

CREATE POLICY "carreras_select" ON carreras
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "carreras_insert" ON carreras
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "carreras_update" ON carreras
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "carreras_delete" ON carreras
    FOR DELETE USING (auth.uid() IS NOT NULL);
