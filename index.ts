// ============================================================
// Types for SENTINEL — White-Label SaaS Attendance System
// ============================================================

export interface Estudiante {
    id: string;
    carnet: string;
    nombre_completo: string;
    carrera: string;
    id_carrera?: string;
    id_facultad?: string;
    sexo?: 'M' | 'F';
    municipio_procedencia?: string;
    telefono?: string;
    id_organizacion?: string;
    created_at?: string;
}

export interface Organizacion {
    id: string;
    nombre: string;
    slug?: string;
    logo_url?: string;
    color_primario?: string;
    color_secundario?: string;
    color_acento?: string;
    tipo_organizacion?: 'estudiante' | 'empleado' | null;
    nomenclatura?: {
        sede?: string;
        facultad?: string;
        carrera?: string;
    };
    created_at?: string;
}

export interface Perfil {
    id: string;
    id_organizacion?: string;
    nombre_completo?: string;
    telefono?: string;
    rol?: 'docente' | 'coordinador' | 'director' | 'admin';
    created_at?: string;
}

// ── Catálogos Multi-Tenant ────────────────────────────────────

export interface Sede {
    id: string;
    id_organizacion: string;
    nombre: string;
    created_at?: string;
}

export interface Facultad {
    id: string;
    id_organizacion: string;
    nombre: string;
    created_at?: string;
}

export interface Carrera {
    id: string | number;
    nombre: string;
    id_facultad?: string;
    id_organizacion?: string;
}

export interface Modalidad {
    id: string | number;
    nombre: string;
    id_organizacion?: string;
}

// ── Grupos de Clase ──────────────────────────────────────────

export interface GrupoClase {
    id: string;
    id_docente: string;
    id_organizacion?: string;
    nombre_asignatura: string;
    id_carrera: string | number;
    id_modalidad: string | number;
    codigo_grupo: string | null;
    horario: string;
    dias: string[];
    hora_inicio: string | null;
    hora_fin: string | null;
    tolerancia_min: number;
    id_sede?: string | null;
    sede_nombre?: string | null;
    sede_legado?: string | null;
    sede: string;
    aula: string;
    created_at?: string;
}

// ── Matrículas y Asistencia ──────────────────────────────────

export interface Matricula {
    id: string;
    id_grupo: string;
    id_estudiante: string;
    id_organizacion?: string;
    created_at?: string;
    estudiante?: Estudiante;
}

export type EstadoAsistencia = 'presente' | 'tarde' | 'ausente';

export interface RegistroAsistencia {
    id: string;
    id_grupo: string;
    id_estudiante: string;
    id_organizacion?: string;
    fecha_hora_escaneo: string;
    estado: EstadoAsistencia;
    fecha_clase: string;
    created_at?: string;
    estudiante?: Estudiante;
}

export interface ScanResult {
    estudiante: Estudiante;
    estado: EstadoAsistencia;
    hora: string;
    error?: boolean;
    message?: string;
}

export interface ClassSession {
    grupo: GrupoClase;
    startTime: Date;
    records: RegistroAsistencia[];
}

export interface AttendanceSummary {
    total: number;
    presentes: number;
    tardes: number;
    ausentes: number;
    presentesH?: number;
    presentesM?: number;
    tardesH?: number;
    tardesM?: number;
    ausentesH?: number;
    ausentesM?: number;
}
