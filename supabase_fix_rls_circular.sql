-- ============================================================
-- FIX: RLS Circular en tabla perfiles
-- El problema: La política SELECT se referencia a sí misma,
-- creando un loop infinito que bloquea el acceso
-- ============================================================

-- 1. Eliminar políticas RLS existentes de perfiles
DROP POLICY IF EXISTS "SENTINEL_Perfiles_Select" ON perfiles;
DROP POLICY IF EXISTS "SENTINEL_Perfiles_Update_Self" ON perfiles;

-- 2. Recrear políticas RLS CORRECTAS para perfiles
-- SELECT: usuarios pueden ver su propio perfil
CREATE POLICY "SENTINEL_Perfiles_Select" ON perfiles
    FOR SELECT USING (auth.uid() = id);

-- UPDATE: usuarios pueden actualizar solo su propio perfil
CREATE POLICY "SENTINEL_Perfiles_Update" ON perfiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Verificar que la política de organizaciones sigue funcionando
-- (no necesita cambios, ya que usa subconsulta correcta a perfiles)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'organizaciones';

-- 4. Verificar perfiles ahora son accesibles
SELECT id, rol, id_organizacion FROM perfiles LIMIT 5;
