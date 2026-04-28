import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useBranding } from '../contexts/BrandingContext';
import { Icon } from '../components/Icon';
import type { Sede, Facultad, Carrera, Modalidad } from '../types';

type CatalogType = 'sedes' | 'facultades' | 'carreras' | 'modalidades' | 'nomenclatura';
type CatalogItem = Sede | Facultad | Carrera | Modalidad | Record<string, string>;

const CATALOG_CONFIG: Record<CatalogType, { label: string; labelSingular: string; icon: string }> = {
    sedes:       { label: 'Estructura',    labelSingular: 'Estructura', icon: '🏛️' },
    facultades:  { label: 'Facultades',    labelSingular: 'Facultad',   icon: '🎓' },
    carreras:    { label: 'Carreras',      labelSingular: 'Carrera',    icon: '📚' },
    modalidades: { label: 'Modalidades',   labelSingular: 'Modalidad',  icon: '📋' },
    nomenclatura:{ label: 'Nomenclatura',  labelSingular: 'Nomenclatura', icon: '🏷️' },
};

interface AdminSettingsPageProps {
    onSignOut: () => void;
}

export default function AdminSettingsPage({ onSignOut }: AdminSettingsPageProps) {
    const navigate = useNavigate();
    const { orgId, orgName, isAdmin, nomenclatura, refreshBranding } = useBranding();

    const [activeTab, setActiveTab] = useState<CatalogType>('sedes');
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [nomenclaturaForm, setNomenclaturaForm] = useState({
        sede: nomenclatura.sede,
        facultad: nomenclatura.facultad,
        carrera: nomenclatura.carrera,
    });

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
    const [formNombre, setFormNombre] = useState('');

    // Redirect si no es admin o si no tiene organización (huérfano)
    useEffect(() => {
        if (!isAdmin || !orgId) {
            navigate('/');
        }
    }, [isAdmin, orgId, navigate]);

    // Actualizar formulario de nomenclatura cuando cambia el contexto
    useEffect(() => {
        setNomenclaturaForm({
            sede: nomenclatura.sede,
            facultad: nomenclatura.facultad,
            carrera: nomenclatura.carrera,
        });
    }, [nomenclatura]);

    const loadItems = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        setError('');
        try {
            const { data, error: dbError } = await supabase
                .from(activeTab)
                .select('*')
                .eq('id_organizacion', orgId)
                .order('nombre');
            if (dbError) throw dbError;
            setItems(data || []);
        } catch (err) {
            const getTabLabel = () => {
                if (activeTab === 'sedes') return nomenclatura.sede.toLowerCase();
                if (activeTab === 'facultades') return nomenclatura.facultad.toLowerCase();
                if (activeTab === 'carreras') return nomenclatura.carrera.toLowerCase();
                return CATALOG_CONFIG[activeTab].label.toLowerCase();
            };
            setError(`Error cargando ${getTabLabel()}.`);
        } finally {
            setLoading(false);
        }
    }, [activeTab, orgId]);

    useEffect(() => {
        if (activeTab !== 'nomenclatura') {
            loadItems();
        }
    }, [loadItems, activeTab]);

    const openCreate = () => {
        setEditingItem(null);
        setFormNombre('');
        setShowModal(true);
    };

    const openEdit = (item: CatalogItem) => {
        setEditingItem(item);
        setFormNombre(item.nombre);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
        setFormNombre('');
    };

    const handleSave = async () => {
        if (!formNombre.trim()) return;
        if (!orgId) return;
        setSaving(true);
        setError('');
        try {
            const getLabelSingular = () => {
                if (activeTab === 'sedes') return nomenclatura.sede;
                if (activeTab === 'facultades') return nomenclatura.facultad;
                if (activeTab === 'carreras') return nomenclatura.carrera;
                return CATALOG_CONFIG[activeTab].labelSingular;
            };

            if (editingItem) {
                const { error: updateError } = await supabase
                    .from(activeTab)
                    .update({ nombre: formNombre.trim() })
                    .eq('id', (editingItem as any).id);
                if (updateError) throw updateError;
                setSuccess(`${getLabelSingular()} actualizado correctamente.`);
            } else {
                const payload: any = { nombre: formNombre.trim(), id_organizacion: orgId };
                const { error: insertError } = await supabase
                    .from(activeTab)
                    .insert(payload);
                if (insertError) throw insertError;
                setSuccess(`${getLabelSingular()} creado correctamente.`);
            }
            closeModal();
            await loadItems();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: CatalogItem) => {
        if (activeTab === 'nomenclatura') return;
        const getLabelSingular = () => {
            if (activeTab === 'sedes') return nomenclatura.sede;
            if (activeTab === 'facultades') return nomenclatura.facultad;
            if (activeTab === 'carreras') return nomenclatura.carrera;
            return CATALOG_CONFIG[activeTab].labelSingular;
        };
        if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
        setError('');
        try {
            const { error: deleteError } = await supabase
                .from(activeTab)
                .delete()
                .eq('id', (item as any).id);
            if (deleteError) throw deleteError;
            setSuccess(`${getLabelSingular()} eliminado.`);
            await loadItems();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(''), 4000);
        } catch (err: any) {
            console.error('Delete error:', err);
            let msg = 'Error al eliminar.';
            if (err.code === '23503') {
                msg = `No se puede eliminar este/a ${getLabelSingular().toLowerCase()} porque está siendo utilizado por otros registros (ej: clases o estudiantes).`;
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSaveNomenclatura = async () => {
        if (!orgId) return;
        setSaving(true);
        setError('');
        try {
            const { error: updateError } = await supabase
                .from('organizaciones')
                .update({ nomenclatura: JSON.stringify(nomenclaturaForm) })
                .eq('id', orgId);
            if (updateError) throw updateError;
            setSuccess('Nomenclatura guardada. Los cambios se reflejarán inmediatamente.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            refreshBranding();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar la nomenclatura.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app-layout">
                {/* Header */}
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate('/')} aria-label="Volver">←</button>
                    <div className="flex-1 ml-md">
                        <h1><Icon name="settings" size={20} /> Configuración</h1>
                        <p className="subtitle">{orgName || 'Mi Organización'} — Catálogos</p>
                    </div>
                    <div className="header-actions-compact">
                        <button
                            className="btn btn-sm"
                            style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '10px', padding: '8px 14px' }}
                            onClick={() => navigate('/admin/brand')}
                        >
                            🎨 Marca
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('¿Cerrar sesión?')) {
                                    onSignOut();
                                }
                            }}
                            className="btn btn-sm btn-logout"
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </header>

            <main className="page">
                {/* Tabs */}
                <div className="admin-tabs">
                    {(Object.keys(CATALOG_CONFIG) as CatalogType[]).map(tab => {
                        const getTabLabel = () => {
                            if (tab === 'sedes') return nomenclatura.sede;
                            if (tab === 'facultades') return nomenclatura.facultad;
                            if (tab === 'carreras') return nomenclatura.carrera;
                            return CATALOG_CONFIG[tab].label;
                        };
                        return (
                            <button
                                key={tab}
                                className={`admin-tab ${activeTab === tab ? 'admin-tab-active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                <span>{CATALOG_CONFIG[tab].icon}</span>
                                <span>{getTabLabel()}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Feedback banners */}
                {success && (
                    <div className="success-banner" style={{ marginBottom: '16px' }}>
                        ✅ {success}
                    </div>
                )}
                {error && (
                    <div className="error-message-panel" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                {/* Action bar */}
                <div className="admin-action-bar">
                    <h2 className="section-title" style={{ margin: 0 }}>
                        {CATALOG_CONFIG[activeTab].icon} {
                            activeTab === 'sedes' ? nomenclatura.sede :
                            activeTab === 'facultades' ? nomenclatura.facultad :
                            activeTab === 'carreras' ? nomenclatura.carrera :
                            CATALOG_CONFIG[activeTab].label
                        }
                    </h2>
                    {activeTab !== 'nomenclatura' && (() => {
                        const singularLabel =
                            activeTab === 'sedes' ? nomenclatura.sede :
                            activeTab === 'facultades' ? nomenclatura.facultad :
                            activeTab === 'carreras' ? nomenclatura.carrera :
                            CATALOG_CONFIG[activeTab].labelSingular;
                        return (
                            <button className="btn btn-primary btn-sm" onClick={openCreate}>
                                + Nueva {singularLabel}
                            </button>
                        );
                    })()}
                </div>

                {/* Nomenclatura Form */}
                {activeTab === 'nomenclatura' && (
                    <div className="nomenclatura-section">
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                            Personaliza los nombres de las categorías según la estructura de tu institución.
                            Estos nombres se mostrarán en todo el sistema.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Nombre para Sedes</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Ej: Sedes, Recintos, Campus, Facultades..."
                                value={nomenclaturaForm.sede}
                                onChange={e => setNomenclaturaForm(prev => ({ ...prev, sede: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nombre para Facultades</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Ej: Facultades, Escuelas, Departamentos..."
                                value={nomenclaturaForm.facultad}
                                onChange={e => setNomenclaturaForm(prev => ({ ...prev, facultad: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nombre para Carreras</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Ej: Carreras, Programas, Cursos..."
                                value={nomenclaturaForm.carrera}
                                onChange={e => setNomenclaturaForm(prev => ({ ...prev, carrera: e.target.value }))}
                            />
                        </div>
                        <button
                            className="btn btn-primary btn-block"
                            onClick={handleSaveNomenclatura}
                            disabled={saving}
                            style={{ marginTop: '20px' }}
                        >
                            {saving ? <><div className="spinner spinner-sm" /> Guardando...</> : '💾 Guardar Nomenclatura'}
                        </button>
                    </div>
                )}

                {/* List */}
                {activeTab !== 'nomenclatura' && (loading ? (
                    <div className="loading-screen" style={{ minHeight: '200px' }}>
                        <div className="spinner" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="empty-state" style={{ padding: '40px 20px' }}>
                        <div className="empty-state-icon">{CATALOG_CONFIG[activeTab].icon}</div>
                        <h3>Sin {
                            activeTab === 'sedes' ? nomenclatura.sede.toLowerCase() :
                            activeTab === 'facultades' ? nomenclatura.facultad.toLowerCase() :
                            activeTab === 'carreras' ? nomenclatura.carrera.toLowerCase() :
                            CATALOG_CONFIG[activeTab].label.toLowerCase()
                        }</h3>
                        <p>Agrega el primero para que los docentes puedan usarlo.</p>
                        <button className="btn btn-primary" onClick={openCreate}>
                            + Añadir {
                                activeTab === 'sedes' ? nomenclatura.sede :
                                activeTab === 'facultades' ? nomenclatura.facultad :
                                activeTab === 'carreras' ? nomenclatura.carrera :
                                CATALOG_CONFIG[activeTab].labelSingular
                            }
                        </button>
                    </div>
                ) : (
                    <div className="catalog-list">
                        {items.map((item) => (
                            <div key={(item as any).id} className="catalog-item">
                                <div className="catalog-item-info">
                                    <span className="catalog-item-icon">{CATALOG_CONFIG[activeTab].icon}</span>
                                    <span className="catalog-item-name">{item.nombre}</span>
                                </div>
                                <div className="catalog-item-actions">
                                    <button
                                        className="icon-btn"
                                        onClick={() => openEdit(item)}
                                        aria-label="Editar"
                                    >✏️</button>
                                    <button
                                        className="icon-btn icon-btn-danger"
                                        onClick={() => handleDelete(item)}
                                        aria-label="Eliminar"
                                    >🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </main>

            {/* Modal */}
            {showModal && activeTab !== 'nomenclatura' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">
                            {editingItem ? `Editar ${
                                activeTab === 'sedes' ? nomenclatura.sede :
                                activeTab === 'facultades' ? nomenclatura.facultad :
                                activeTab === 'carreras' ? nomenclatura.carrera :
                                CATALOG_CONFIG[activeTab].labelSingular
                            }` : `Nuevo/a ${
                                activeTab === 'sedes' ? nomenclatura.sede :
                                activeTab === 'facultades' ? nomenclatura.facultad :
                                activeTab === 'carreras' ? nomenclatura.carrera :
                                CATALOG_CONFIG[activeTab].labelSingular
                            }`}
                        </h2>
                        <div className="form-group">
                            <label className="form-label" htmlFor="nombre-catalog">Nombre *</label>
                            <input
                                id="nombre-catalog"
                                className="form-input"
                                type="text"
                                placeholder={`Nombre del/de la ${
                                    activeTab === 'sedes' ? nomenclatura.sede :
                                    activeTab === 'facultades' ? nomenclatura.facultad :
                                    activeTab === 'carreras' ? nomenclatura.carrera :
                                    CATALOG_CONFIG[activeTab].labelSingular.toLowerCase()
                                }`}
                                value={formNombre}
                                onChange={e => setFormNombre(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formNombre.trim()}>
                                {saving ? <div className="spinner spinner-sm" /> : (editingItem ? 'Guardar Cambios' : 'Crear')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS adicional inline para estilos de admin */}
            <style>{`
                .admin-tabs {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 8px;
                    margin-bottom: 20px;
                    scrollbar-width: none;
                }
                .admin-tabs::-webkit-scrollbar { display: none; }
                .admin-tab {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    background: var(--color-surface);
                    border: 1.5px solid var(--color-border);
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--color-text-secondary);
                    white-space: nowrap;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 72px;
                }
                .admin-tab:active { transform: scale(0.95); }
                .admin-tab-active {
                    background: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }
                .admin-action-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .catalog-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .catalog-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    padding: 14px 16px;
                }
                .catalog-item-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .catalog-item-icon { font-size: 1.1rem; }
                .catalog-item-name { font-weight: 600; font-size: 0.95rem; }
                .catalog-item-actions { display: flex; gap: 6px; }
                .icon-btn {
                    background: none;
                    border: none;
                    font-size: 1.1rem;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    transition: background 0.15s;
                }
                .icon-btn:hover { background: var(--color-border); }
                .icon-btn-danger:hover { background: rgba(239,68,68,0.1); }
                }
                .error-message-panel {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.4);
                    color: #ef4444;
                    border-radius: 12px;
                    padding: 14px 18px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    line-height: 1.4;
                }
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    z-index: 1000;
                }
                .modal-card {
                    background: var(--color-surface);
                    border-radius: 20px;
                    padding: 28px 24px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                .modal-title {
                    font-size: 1.2rem;
                    font-weight: 700;
                    margin-bottom: 20px;
                }
                .modal-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .modal-actions .btn { flex: 1; }
                .form-hint {
                    font-size: 0.75rem;
                    color: var(--color-text-secondary);
                    margin-top: 4px;
                }
                .link-style {
                    color: var(--color-primary);
                    text-decoration: underline;
                    cursor: pointer;
                }
                .header-actions-compact {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .btn-logout {
                    background: rgba(239,68,68,0.1);
                    border: 1px solid rgba(239,68,68,0.3);
                    color: #dc2626;
                    padding: 8px 12px;
                    border-radius: 10px;
                }
                .btn-logout:hover {
                    background: rgba(239,68,68,0.2);
                }
                .nomenclatura-section {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 20px;
                }
            `}</style>
        </div>
    );
}
