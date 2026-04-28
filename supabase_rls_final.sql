-- =====================================================
-- SENTINEL - Políticas RLS Finales (Multi-Tenant)
-- Ejecutar después de supabase_saneamiento.sql
-- =====================================================

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facultades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia_registros ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS: organizaciones
-- =====================================================

-- Ver organización propia
CREATE POLICY "Ver organizacion propia"
ON public.organizaciones FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = organizaciones.id
    )
);

-- Actualizar solo Director/Admin de SU organización
CREATE POLICY "Actualizar organizacion (director/admin)"
ON public.organizaciones FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = organizaciones.id
        AND perfiles.rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: perfiles
-- =====================================================

-- Ver perfil propio
CREATE POLICY "Ver perfil propio"
ON public.perfiles FOR SELECT
USING (auth.uid() = id);

-- Ver todos los perfiles de la organización (para admins)
CREATE POLICY "Ver perfiles de org"
ON public.perfiles FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

-- Actualizar perfil propio
CREATE POLICY "Actualizar perfil propio"
ON public.perfiles FOR UPDATE
USING (auth.uid() = id);

-- Crear perfiles (solo Director/Admin de la org)
CREATE POLICY "Crear perfiles (director/admin)"
ON public.perfiles FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: facultades (antiguas direcciones)
-- =====================================================

CREATE POLICY "Facultades: ver"
ON public.facultades FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Facultades: crear"
ON public.facultades FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Facultades: actualizar"
ON public.facultades FOR UPDATE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Facultades: eliminar"
ON public.facultades FOR DELETE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: sedes
-- =====================================================

CREATE POLICY "Sedes: ver"
ON public.sedes FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Sedes: crear"
ON public.sedes FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Sedes: actualizar"
ON public.sedes FOR UPDATE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Sedes: eliminar"
ON public.sedes FOR DELETE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: carreras
-- =====================================================

CREATE POLICY "Carreras: ver"
ON public.carreras FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Carreras: crear"
ON public.carreras FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Carreras: actualizar"
ON public.carreras FOR UPDATE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Carreras: eliminar"
ON public.carreras FOR DELETE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: modalidades
-- =====================================================

CREATE POLICY "Modalidades: ver"
ON public.modalidades FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Modalidades: crear"
ON public.modalidades FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Modalidades: actualizar"
ON public.modalidades FOR UPDATE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Modalidades: eliminar"
ON public.modalidades FOR DELETE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS: grupos_clase
-- =====================================================

CREATE POLICY "Grupos: ver"
ON public.grupos_clase FOR SELECT
USING (
    id_docente = auth.uid()
    OR id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Grupos: crear"
ON public.grupos_clase FOR INSERT
WITH CHECK (id_docente = auth.uid());

CREATE POLICY "Grupos: actualizar"
ON public.grupos_clase FOR UPDATE
USING (
    id_docente = auth.uid()
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
        AND id_organizacion = grupos_clase.id_organizacion
    )
);

CREATE POLICY "Grupos: eliminar"
ON public.grupos_clase FOR DELETE
USING (
    id_docente = auth.uid()
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'admin')
        AND id_organizacion = grupos_clase.id_organizacion
    )
);

-- =====================================================
-- POLÍTICAS: estudiantes
-- =====================================================

CREATE POLICY "Estudiantes: ver"
ON public.estudiantes FOR SELECT
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Estudiantes: crear"
ON public.estudiantes FOR INSERT
WITH CHECK (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

CREATE POLICY "Estudiantes: actualizar"
ON public.estudiantes FOR UPDATE
USING (
    id_organizacion = (SELECT id_organizacion FROM perfiles WHERE id = auth.uid())
);

-- =====================================================
-- POLÍTICAS: matriculas
-- =====================================================

-- Ver matrículas de grupos propios o como admin
CREATE POLICY "Matriculas: ver"
ON public.matriculas FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = matriculas.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Matriculas: crear"
ON public.matriculas FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = matriculas.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
);

CREATE POLICY "Matriculas: eliminar"
ON public.matriculas FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = matriculas.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
);

-- =====================================================
-- POLÍTICAS: asistencia_registros
-- =====================================================

CREATE POLICY "Asistencia: ver"
ON public.asistencia_registros FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Asistencia: registrar"
ON public.asistencia_registros FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
);

CREATE POLICY "Asistencia: actualizar"
ON public.asistencia_registros FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM perfiles 
        WHERE id = auth.uid() 
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
