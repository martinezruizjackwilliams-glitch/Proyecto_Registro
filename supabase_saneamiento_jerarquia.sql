-- ============================================================
-- SCRIPT DE SANEAMIENTO: Jerarquía Multi-Tenant Completa
-- Org → Facultad → Carrera → Módulo
-- Org → Sede → Aula/Horario
-- ============================================================

-- ============================================================
-- 1. FACULTADES - Agregar id_organizacion si no existe
-- ============================================================
ALTER TABLE facultades ADD COLUMN IF NOT EXISTS id_organizacion UUID;

-- Crear FK facultades → organizaciones
ALTER TABLE facultades DROP CONSTRAINT IF EXISTS fk_facultades_org;
ALTER TABLE facultades 
    ADD CONSTRAINT fk_facultades_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 2. CARRERAS - Corregir: id_direcciones → id_facultad
-- ============================================================
-- Agregar columna id_facultad si no existe
ALTER TABLE carreras ADD COLUMN IF NOT EXISTS id_facultad UUID;

-- Crear FK carreras → facultades
ALTER TABLE carreras DROP CONSTRAINT IF EXISTS fk_carreras_facultad;
ALTER TABLE carreras 
    ADD CONSTRAINT fk_carreras_facultad 
    FOREIGN KEY (id_facultad) 
    REFERENCES facultades(id) 
    ON DELETE SET NULL;

-- Asegurar que carreras tenga id_organizacion
ALTER TABLE carreras ADD COLUMN IF NOT EXISTS id_organizacion UUID;

-- Crear FK directa carreras → organizaciones (backup si no hay facultad)
ALTER TABLE carreras DROP CONSTRAINT IF EXISTS fk_carreras_org;
ALTER TABLE carreras 
    ADD CONSTRAINT fk_carreras_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 3. ESTUDIANTES - Asegurar relación con carrera
-- ============================================================
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS id_carrera UUID;

-- Crear FK estudiantes → carreras
ALTER TABLE estudiantes DROP CONSTRAINT IF EXISTS fk_estudiantes_carrera;
ALTER TABLE estudiantes 
    ADD CONSTRAINT fk_estudiantes_carrera 
    FOREIGN KEY (id_carrera) 
    REFERENCES carreras(id) 
    ON DELETE SET NULL;

-- Asegurar que estudiantes tenga id_organizacion
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS id_organizacion UUID;
ALTER TABLE estudiantes DROP CONSTRAINT IF EXISTS fk_estudiantes_org;
ALTER TABLE estudiantes 
    ADD CONSTRAINT fk_estudiantes_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 4. GRUPOS_CLASE (MÓDULOS) - Asegurar todas las FK
-- ============================================================
-- Ya debe tener id_organizacion, id_carrera, id_sede
ALTER TABLE grupos_clase ADD COLUMN IF NOT EXISTS id_organizacion UUID;
ALTER TABLE grupos_clase ADD COLUMN IF NOT EXISTS id_carrera UUID;
ALTER TABLE grupos_clase ADD COLUMN IF NOT EXISTS id_sede UUID;

-- FK grupos_clase → carreras
ALTER TABLE grupos_clase DROP CONSTRAINT IF EXISTS fk_grupos_carrera;
ALTER TABLE grupos_clase 
    ADD CONSTRAINT fk_grupos_carrera 
    FOREIGN KEY (id_carrera) 
    REFERENCES carreras(id) 
    ON DELETE SET NULL;

-- FK grupos_clase → sedes
ALTER TABLE grupos_clase DROP CONSTRAINT IF EXISTS fk_grupos_sede;
ALTER TABLE grupos_clase 
    ADD CONSTRAINT fk_grupos_sede 
    FOREIGN KEY (id_sede) 
    REFERENCES sedes(id) 
    ON DELETE SET NULL;

-- FK grupos_clase → organizaciones
ALTER TABLE grupos_clase DROP CONSTRAINT IF EXISTS fk_grupos_org;
ALTER TABLE grupos_clase 
    ADD CONSTRAINT fk_grupos_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 5. MATRICULAS - Asegurar relación
-- ============================================================
ALTER TABLE matriculas ADD COLUMN IF NOT EXISTS id_organizacion UUID;

ALTER TABLE matriculas DROP CONSTRAINT IF EXISTS fk_matriculas_org;
ALTER TABLE matriculas 
    ADD CONSTRAINT fk_matriculas_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 6. ASISTENCIA_REGISTROS - Asegurar relación
-- ============================================================
ALTER TABLE asistencia_registros ADD COLUMN IF NOT EXISTS id_organizacion UUID;

ALTER TABLE asistencia_registros DROP CONSTRAINT IF EXISTS fk_asistencia_org;
ALTER TABLE asistencia_registros 
    ADD CONSTRAINT fk_asistencia_org 
    FOREIGN KEY (id_organizacion) 
    REFERENCES organizaciones(id) 
    ON DELETE CASCADE;

-- ============================================================
-- 7. RLS - Políticas Multi-Tenant
-- ============================================================

-- FACULTADES
ALTER TABLE facultades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "facultades_all" ON facultades;
CREATE POLICY "facultades_all" ON facultades FOR ALL USING (true) WITH CHECK (true);

-- CARRERAS
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "carreras_all" ON carreras;
CREATE POLICY "carreras_all" ON carreras FOR ALL USING (true) WITH CHECK (true);

-- ESTUDIANTES
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "estudiantes_all" ON estudiantes;
CREATE POLICY "estudiantes_all" ON estudiantes FOR ALL USING (true) WITH CHECK (true);

-- GRUPOS_CLASE
ALTER TABLE grupos_clase ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_clase_select" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_insert" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_update" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_delete" ON grupos_clase;
CREATE POLICY "grupos_clase_all" ON grupos_clase FOR ALL USING (true) WITH CHECK (true);

-- MATRICULAS
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matriculas_all" ON matriculas;
CREATE POLICY "matriculas_all" ON matriculas FOR ALL USING (true) WITH CHECK (true);

-- ASISTENCIA_REGISTROS
ALTER TABLE asistencia_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asistencia_registros_all" ON asistencia_registros;
CREATE POLICY "asistencia_registros_all" ON asistencia_registros FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. LIMPIEZA - Eliminar tablas/datos obsoletos
-- ============================================================
-- Eliminar tabla direcciones si no se usa (era de la primera universidad)
-- DROP TABLE IF EXISTS direcciones CASCADE;

-- Eliminar tabla universidades si existe (era redundante)
-- DROP TABLE IF EXISTS universidades CASCADE;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT 'Facultades' as tabla, count(*) as total FROM facultades
-- UNION ALL SELECT 'Carreras', count(*) FROM carreras
-- UNION ALL SELECT 'Estudiantes', count(*) FROM estudiantes
-- UNION ALL SELECT 'Grupos', count(*) FROM grupos_clase
-- UNION ALL SELECT 'Sedes', count(*) FROM sedes;
