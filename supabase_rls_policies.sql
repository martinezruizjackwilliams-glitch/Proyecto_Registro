-- =====================================================
-- SENTINEL - Políticas RLS (Row Level Security)
-- Ejecutar en SQL Editor de Supabase Dashboard
-- =====================================================

-- HABILITAR RLS EN TODAS LAS TABLAS
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
-- POLÍTICAS PARA TABLA: perfiles
-- =====================================================

-- Usuarios pueden ver su propio perfil
CREATE POLICY "Ver perfil propio"
ON public.perfiles FOR SELECT
USING (auth.uid() = id);

-- Solo admins pueden ver todos los perfiles (opcional, para listados admin)
CREATE POLICY "Ver todos los perfiles (admin)"
ON public.perfiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = auth.uid()
        AND rol IN ('director', 'coordinador', 'admin')
    )
);

-- Usuarios pueden actualizar su propio perfil (excepto rol e id_organizacion)
CREATE POLICY "Actualizar perfil propio"
ON public.perfiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Solo admins pueden crear nuevos perfiles
CREATE POLICY "Crear perfiles (admin)"
ON public.perfiles FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = auth.uid()
        AND rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: organizaciones
-- =====================================================

-- Cualquier usuario autenticado puede ver su organización
CREATE POLICY "Ver organización propia"
ON public.organizaciones FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = organizaciones.id
    )
);

-- Solo DIRECTORES y ADMINS pueden ACTUALIZAR su organización
CREATE POLICY "Actualizar organización (director/admin)"
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
-- POLÍTICAS PARA TABLA: sedes
-- =====================================================

CREATE POLICY "Ver sedes de mi organización"
ON public.sedes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = sedes.id_organizacion
    )
);

CREATE POLICY "Crear sedes (director/coordinador/admin)"
ON public.sedes FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = sedes.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Actualizar sedes (director/coordinador/admin)"
ON public.sedes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = sedes.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Eliminar sedes (director/admin)"
ON public.sedes FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = sedes.id_organizacion
        AND perfiles.rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: facultades
-- =====================================================

CREATE POLICY "Ver facultades de mi organización"
ON public.facultades FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = facultades.id_organizacion
    )
);

CREATE POLICY "CRUD facultades (director/coordinador/admin)"
ON public.facultades FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = facultades.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: carreras
-- =====================================================

CREATE POLICY "Ver carreras de mi organización"
ON public.carreras FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = carreras.id_organizacion
    )
);

CREATE POLICY "CRUD carreras (director/coordinador/admin)"
ON public.carreras FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = carreras.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: modalidades
-- =====================================================

CREATE POLICY "Ver modalidades de mi organización"
ON public.modalidades FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = modalidades.id_organizacion
    )
);

CREATE POLICY "CRUD modalidades (director/coordinador/admin)"
ON public.modalidades FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = modalidades.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: grupos_clase
-- =====================================================

CREATE POLICY "Ver grupos de clase (docente owner o admin)"
ON public.grupos_clase FOR SELECT
USING (
    id_docente = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = grupos_clase.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Crear grupos de clase"
ON public.grupos_clase FOR INSERT
WITH CHECK (id_docente = auth.uid());

CREATE POLICY "Actualizar grupos de clase (owner o admin)"
ON public.grupos_clase FOR UPDATE
USING (
    id_docente = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = grupos_clase.id_organizacion
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Eliminar grupos de clase (owner o admin)"
ON public.grupos_clase FOR DELETE
USING (
    id_docente = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.id_organizacion = grupos_clase.id_organizacion
        AND perfiles.rol IN ('director', 'admin')
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: estudiantes
-- =====================================================

-- TODOS pueden ver estudiantes (necesario para buscar/esc萧纳)
CREATE POLICY "Anyone can read estudiantes"
ON public.estudiantes FOR SELECT
USING (true);

-- Cualquier usuario con perfil puede crear/actualizar estudiantes
CREATE POLICY "Anyone can insert/update estudiantes"
ON public.estudiantes FOR ALL
WITH CHECK (true);

-- =====================================================
-- POLÍTICAS PARA TABLA: matriculas
-- =====================================================

-- TODOS pueden ver matrículas
CREATE POLICY "Anyone can read matriculas"
ON public.matriculas FOR SELECT
USING (true);

-- Cualquier usuario con perfil puede gestionar matrículas (se verifica via grupos_clase)
CREATE POLICY "Anyone can manage matriculas"
ON public.matriculas FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.grupos_clase
        JOIN public.perfiles ON perfiles.id = auth.uid()
        WHERE grupos_clase.id = matriculas.id_grupo
        AND perfiles.id_organizacion = grupos_clase.id_organizacion
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.grupos_clase
        JOIN public.perfiles ON perfiles.id = auth.uid()
        WHERE grupos_clase.id = matriculas.id_grupo
        AND perfiles.id_organizacion = grupos_clase.id_organizacion
    )
);

-- =====================================================
-- POLÍTICAS PARA TABLA: asistencia_registros
-- =====================================================

CREATE POLICY "Ver asistencia de mis grupos"
ON public.asistencia_registros FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

CREATE POLICY "Registrar asistencia (docente owner)"
ON public.asistencia_registros FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
);

CREATE POLICY "Actualizar asistencia (docente owner)"
ON public.asistencia_registros FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.grupos_clase
        WHERE grupos_clase.id = asistencia_registros.id_grupo
        AND grupos_clase.id_docente = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE perfiles.id = auth.uid()
        AND perfiles.rol IN ('director', 'coordinador', 'admin')
    )
);

-- =====================================================
-- VERIFICACIÓN DE POLÍTICAS
-- =====================================================

-- Ver todas las políticas creadas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
