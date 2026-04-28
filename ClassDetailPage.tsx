import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGruposDocente, getMatriculasGrupo, deleteGrupoClase } from '../services/attendance';
import type { GrupoClase, Matricula, Estudiante } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';
import { Icon } from '../components/Icon';
import { useBranding } from '../contexts/BrandingContext';
import { getStudentTerm } from '../utils/terminology';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export default function ClassDetailPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [grupo, setGrupo] = useState<GrupoClase | null>(null);
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [loading, setLoading] = useState(true);
    const { entityType } = useBranding();

    const handleScan = () => navigate(`/scan/${grupoId}`);
    const handleNfc = () => navigate(`/nfc-scan/${grupoId}`);
    const handleEdit = () => navigate(`/edit-class/${grupoId}`);
    const handleStudents = () => navigate(`/add-students/${grupoId}`);
    const handleQr = () => navigate(`/qr-cards/${grupoId}`);
    const handleReports = () => navigate(`/reportes/${grupoId}`);

    useEffect(() => {
        loadData();
    }, [grupoId]);

    const loadData = async () => {
        if (!grupoId) return;
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(g => g.id == grupoId);
            setGrupo(g || null);
            const mats = await getMatriculasGrupo(grupoId);
            setMatriculas(mats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar esta clase y todos sus registros?')) return;
        if (!grupoId) return;
        try {
            await deleteGrupoClase(grupoId);
            navigate('/');
        } catch (err) {
            console.error(err);
        }
    };

    /* ── Loading ──────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p className="text-secondary">Cargando...</p>
            </div>
        );
    }

    /* ── Not Found ────────────────────────────────────────── */
    if (!grupo) {
        return (
            <div className="empty-state">
                <h3>Clase no encontrada</h3>
                <button className="btn btn-primary" onClick={() => navigate(-1)}>Volver</button>
            </div>
        );
    }

    /* ── Action Grid Items ────────────────────────────────── */
    const actionItems: {
        id: string;
        label: string;
        icon: Parameters<typeof Icon>[0]['name'];
        onClick: () => void;
        disabled?: boolean;
        accent?: boolean;
    }[] = [
        {
            id: 'qr-scan',
            label: 'Escáner QR',
            icon: 'qr-camera',
            onClick: () => navigate(`/scan/${grupo.id}`),
            disabled: matriculas.length === 0,
            accent: true,
        },
        {
            id: 'nfc-scan',
            label: 'Escáner NFC',
            icon: 'nfc',
            onClick: () => navigate(`/nfc-scan/${grupo.id}`),
            disabled: matriculas.length === 0,
            accent: true,
        },
        {
            id: 'manual-list',
            label: 'Lista Manual',
            icon: 'list',
            onClick: () => navigate(`/attendance-review/${grupo.id}`),
            disabled: matriculas.length === 0,
        },
        {
            id: 'report-group',
            label: 'Reporte Grupo',
            icon: 'reports',
            onClick: () => navigate(`/reportes/${grupo.id}`),
        },
    ];

    /* ── Management Items ─────────────────────────────────── */
    const managementItems: {
        id: string;
        label: string;
        icon: Parameters<typeof Icon>[0]['name'];
        onClick: () => void;
        disabled?: boolean;
    }[] = [
        {
            id: 'edit-class',
            label: 'Editar Clase',
            icon: 'edit',
            onClick: () => navigate(`/edit-class/${grupo.id}`),
        },
        {
            id: 'manage-students',
            label: `Gestionar ${getStudentTerm(entityType, true)}`,
            icon: 'users',
            onClick: () => navigate(`/add-students/${grupo.id}`),
        },
        {
            id: 'qr-cards',
            label: 'Códigos QR',
            icon: 'qr-phone',
            onClick: () => navigate(`/qr-cards/${grupo.id}`),
            disabled: matriculas.length === 0,
        },
    ];

    return (
        <div className="app-layout">
            {/* ── Header ─────────────────────────────────────── */}
            <header className="app-header">
                <div className="header-row">
                    <button
                        className="back-button"
                        onClick={() => navigate(-1)}
                        aria-label="Volver"
                    >
                        <Icon name="arrow-left" size={20} color="#fff" />
                    </button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>{grupo.nombre_asignatura}</h1>
                        <p className="subtitle">{grupo.codigo_grupo || grupo.horario}</p>
                    </div>
                </div>
            </header>

            <main className="page detail-page-main">
                {/* ── Hero Stats Card ─────────────────────────── */}
                <div className="hero-stats-card" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/80">
                                Sesión Activa
                            </span>
                            <Users size={20} className="text-white/50" />
                        </div>
                        <div>
                            <p className="text-4xl font-bold text-white">{matriculas.length} <span className="text-xl opacity-60">estudiantes</span></p>
                            <p className="text-sm font-medium text-white/80 mt-1">Registrados en esta clase</p>
                        </div>
                    </div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </div>

                {/* ── Class Info Card ────────────────────────── */}
                <div className="detail-info-card">
                    <div className="detail-info-grid">
                        <div className="detail-info-item">
                            <span className="detail-info-label">Horario</span>
                            <span className="detail-info-value">{grupo.horario}</span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">Sede</span>
                            <span className="detail-info-value">{grupo.sede}</span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">Aula</span>
                            <span className="detail-info-value">{grupo.aula}</span>
                        </div>
                        <div className="detail-info-item">
                            <span className="detail-info-label">{getStudentTerm(entityType, true)}</span>
                            <span className="detail-info-value">{matriculas.length}</span>
                        </div>
                        {grupo.hora_inicio && (
                            <div className="detail-info-item">
                                <span className="detail-info-label">Hora Inicio</span>
                                <span className="detail-info-value">{grupo.hora_inicio.substring(0, 5)}</span>
                            </div>
                        )}
                        {grupo.hora_fin && (
                            <div className="detail-info-item">
                                <span className="detail-info-label">Hora Fin</span>
                                <span className="detail-info-value">{grupo.hora_fin.substring(0, 5)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Attendance Actions — 2×2 Grid ──────────── */}
                <p className="section-title" style={{ marginTop: 'var(--space-lg)' }}>Tomar Asistencia</p>
                <div className="detail-action-grid">
                    {actionItems.map((item) => (
                        <button
                            key={item.id}
                            id={`action-${item.id}`}
                            className={`detail-action-btn ${item.accent ? 'detail-action-btn--accent' : ''}`}
                            onClick={item.onClick}
                            disabled={item.disabled}
                        >
                            <span className={`detail-action-icon ${item.accent ? 'detail-action-icon--accent' : ''}`}>
                                <Icon
                                    name={item.icon}
                                    size={28}
                                    color={item.accent ? '#fff' : 'var(--color-primary)'}
                                />
                            </span>
                            <span className="detail-action-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Management Actions ─────────────────────── */}
                <p className="section-title">Gestión</p>
                <div className="detail-mgmt-grid">
                    {managementItems.map((item) => (
                        <button
                            key={item.id}
                            id={`mgmt-${item.id}`}
                            className="detail-mgmt-btn"
                            onClick={item.onClick}
                            disabled={item.disabled}
                        >
                            <Icon name={item.icon} size={22} color="var(--color-primary)" />
                            <span className="detail-mgmt-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Students Preview ───────────────────────── */}
                <p className="section-title">{getStudentTerm(entityType, true)} ({matriculas.length})</p>
                {matriculas.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                        <img
                            src={new URL('../assets/illustrations/empty-students.png', import.meta.url).href}
                            alt={`Sin ${getStudentTerm(entityType, true).toLowerCase()}`}
                            className="empty-state-img"
                        />
                        <h3>Sin {getStudentTerm(entityType, true).toLowerCase()}</h3>
                        <p>Agrega {getStudentTerm(entityType, true).toLowerCase()} para poder tomar asistencia</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate(`/add-students/${grupo.id}`)}
                        >
                            <Icon name="plus" size={16} color="#fff" />
                            Agregar {getStudentTerm(entityType, true)}
                        </button>
                    </div>
                ) : (
                    <>
                        {matriculas.slice(0, 5).map((m) => (
                            <div key={m.id} className="list-item">
                                <div className="list-item-avatar">
                                    {m.estudiante?.nombre_completo?.charAt(0) || '?'}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-name">
                                        {m.estudiante?.nombre_completo || `${getStudentTerm(entityType)} Desconocido`}
                                    </div>
                                    <div className="list-item-detail">{m.estudiante?.carnet || 'Sin Carnet'}</div>
                                </div>
                            </div>
                        ))}
                        {matriculas.length > 5 && (
                            <button
                                className="btn btn-secondary btn-block btn-sm mt-md"
                                onClick={() => navigate(`/add-students/${grupo?.id}`)}
                            >
                                Ver todos ({matriculas.length})
                            </button>
                        )}
                    </>
                )}

                {/* ── Danger Zone ────────────────────────────── */}
                <div className="detail-danger-zone">
                    <button
                        className="detail-danger-btn"
                        onClick={handleDelete}
                    >
                        <Icon name="trash" size={16} color="var(--color-error)" />
                        Eliminar esta clase
                    </button>
                </div>
            </main>

            {/* ── Bottom Navigation ──────────────────────────── */}
        </div>
    );
}
