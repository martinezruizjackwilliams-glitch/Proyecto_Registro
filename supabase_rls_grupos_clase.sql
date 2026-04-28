-- ============================================================
-- RLS Policies: grupos_clase (Multi-Tenant)
-- ============================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "grupos_clase_select" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_insert" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_update" ON grupos_clase;
DROP POLICY IF EXISTS "grupos_clase_delete" ON grupos_clase;

-- SELECT: usuarios pueden ver clases de SU organización
CREATE POLICY "grupos_clase_select" ON grupos_clase
    FOR SELECT USING (
        id_organizacion = (
            SELECT id_organizacion FROM perfiles WHERE id = auth.uid()
        )
    );

-- INSERT: usuarios pueden crear clases en SU organización
CREATE POLICY "grupos_clase_insert" ON grupos_clase
    FOR INSERT WITH CHECK (
        id_organizacion = (
            SELECT id_organizacion FROM perfiles WHERE id = auth.uid()
        )
    );

-- UPDATE: usuarios pueden actualizar clases de SU organización
CREATE POLICY "grupos_clase_update" ON grupos_clase
    FOR UPDATE USING (
        id_organizacion = (
            SELECT id_organizacion FROM perfiles WHERE id = auth.uid()
        )
    );

-- DELETE: usuarios pueden eliminar clases de SU organización
CREATE POLICY "grupos_clase_delete" ON grupos_clase
    FOR DELETE USING (
        id_organizacion = (
            SELECT id_organizacion FROM perfiles WHERE id = auth.uid()
        )
    );
