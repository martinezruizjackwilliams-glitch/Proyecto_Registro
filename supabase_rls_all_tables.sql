-- ============================================================
-- RLS Policies: TODAS las tablas (Multi-Tenant)
-- ============================================================

-- ============================================================
-- ESTUDIANTES
-- ============================================================
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estudiantes_select" ON estudiantes;
DROP POLICY IF EXISTS "estudiantes_insert" ON estudiantes;
DROP POLICY IF EXISTS "estudiantes_update" ON estudiantes;
DROP POLICY IF EXISTS "estudiantes_delete" ON estudiantes;

CREATE POLICY "estudiantes_select" ON estudiantes
    FOR SELECT USING (true);

CREATE POLICY "estudiantes_insert" ON estudiantes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "estudiantes_update" ON estudiantes
    FOR UPDATE USING (true);

CREATE POLICY "estudiantes_delete" ON estudiantes
    FOR DELETE USING (true);

-- ============================================================
-- MATRICULAS
-- ============================================================
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matriculas_select" ON matriculas;
DROP POLICY IF EXISTS "matriculas_insert" ON matriculas;
DROP POLICY IF EXISTS "matriculas_update" ON matriculas;
DROP POLICY IF EXISTS "matriculas_delete" ON matriculas;

CREATE POLICY "matriculas_select" ON matriculas
    FOR SELECT USING (true);

CREATE POLICY "matriculas_insert" ON matriculas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "matriculas_update" ON matriculas
    FOR UPDATE USING (true);

CREATE POLICY "matriculas_delete" ON matriculas
    FOR DELETE USING (true);

-- ============================================================
-- CARRERAS
-- ============================================================
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carreras_select" ON carreras;
DROP POLICY IF EXISTS "carreras_insert" ON carreras;
DROP POLICY IF EXISTS "carreras_update" ON carreras;
DROP POLICY IF EXISTS "carreras_delete" ON carreras;

CREATE POLICY "carreras_select" ON carreras
    FOR SELECT USING (true);

CREATE POLICY "carreras_insert" ON carreras
    FOR INSERT WITH CHECK (true);

CREATE POLICY "carreras_update" ON carreras
    FOR UPDATE USING (true);

CREATE POLICY "carreras_delete" ON carreras
    FOR DELETE USING (true);

-- ============================================================
-- MODALIDADES
-- ============================================================
ALTER TABLE modalidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modalidades_select" ON modalidades;
DROP POLICY IF EXISTS "modalidades_insert" ON modalidades;
DROP POLICY IF EXISTS "modalidades_update" ON modalidades;
DROP POLICY IF EXISTS "modalidades_delete" ON modalidades;

CREATE POLICY "modalidades_select" ON modalidades
    FOR SELECT USING (true);

CREATE POLICY "modalidades_insert" ON modalidades
    FOR INSERT WITH CHECK (true);

CREATE POLICY "modalidades_update" ON modalidades
    FOR UPDATE USING (true);

CREATE POLICY "modalidades_delete" ON modalidades
    FOR DELETE USING (true);

-- ============================================================
-- SEDES
-- ============================================================
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sedes_select" ON sedes;
DROP POLICY IF EXISTS "sedes_insert" ON sedes;
DROP POLICY IF EXISTS "sedes_update" ON sedes;
DROP POLICY IF EXISTS "sedes_delete" ON sedes;

CREATE POLICY "sedes_select" ON sedes
    FOR SELECT USING (true);

CREATE POLICY "sedes_insert" ON sedes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sedes_update" ON sedes
    FOR UPDATE USING (true);

CREATE POLICY "sedes_delete" ON sedes
    FOR DELETE USING (true);

-- ============================================================
-- ASISTENCIA_REGISTROS
-- ============================================================
ALTER TABLE asistencia_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asistencia_registros_select" ON asistencia_registros;
DROP POLICY IF EXISTS "asistencia_registros_insert" ON asistencia_registros;
DROP POLICY IF EXISTS "asistencia_registros_update" ON asistencia_registros;
DROP POLICY IF EXISTS "asistencia_registros_delete" ON asistencia_registros;

CREATE POLICY "asistencia_registros_select" ON asistencia_registros
    FOR SELECT USING (true);

CREATE POLICY "asistencia_registros_insert" ON asistencia_registros
    FOR INSERT WITH CHECK (true);

CREATE POLICY "asistencia_registros_update" ON asistencia_registros
    FOR UPDATE USING (true);

CREATE POLICY "asistencia_registros_delete" ON asistencia_registros
    FOR DELETE USING (true);
