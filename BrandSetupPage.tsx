import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useBranding } from '../contexts/BrandingContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Paletas institucionales predefinidas
const PRESET_PALETTES = [
    {
        name: 'SENTINEL Oscuro',
        description: 'Paleta oficial — Morado/Cian premium',
        primary: '#6C63FF',
        secondary: '#38BDF8',
        accent: '#F472B6',
        preview: ['#6C63FF', '#38BDF8', '#F472B6'],
    },
    {
        name: 'Azul Corporativo',
        description: 'Institucional clásico — Confianza y profesionalismo',
        primary: '#1D4ED8',
        secondary: '#0EA5E9',
        accent: '#F59E0B',
        preview: ['#1D4ED8', '#0EA5E9', '#F59E0B'],
    },
    {
        name: 'Verde Esmeralda',
        description: 'Naturaleza y crecimiento — Fresco y moderno',
        primary: '#059669',
        secondary: '#10B981',
        accent: '#F97316',
        preview: ['#059669', '#10B981', '#F97316'],
    },
    {
        name: 'Rojo Institucional',
        description: 'Energía y liderazgo — Impacto visual fuerte',
        primary: '#DC2626',
        secondary: '#E5743B',
        accent: '#FBBF24',
        preview: ['#DC2626', '#E5743B', '#FBBF24'],
    },
];

interface BrandSetupPageProps {
    onSignOut?: () => void;
}

export default function BrandSetupPage({ onSignOut }: BrandSetupPageProps) {
    const navigate = useNavigate();
    const { orgId, orgName, logoUrl: currentLogoUrl, primaryColor, secondaryColor, accentColor, isAdmin, refreshBranding } = useBranding();

    const [primary, setPrimary] = useState(primaryColor || '#6C63FF');
    const [secondary, setSecondary] = useState(secondaryColor || '#38BDF8');
    const [accent, setAccent] = useState(accentColor || '#F472B6');
    const [logoUrl, setLogoUrl] = useState(currentLogoUrl || '');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Redirect si no es admin o si no tiene organización (huérfano)
    useEffect(() => {
        if (!isAdmin || !orgId) {
            navigate('/');
        }
    }, [isAdmin, orgId, navigate]);

    // Live preview: aplicar colores seleccionados en tiempo real
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-primary', primary);
        root.style.setProperty('--color-secondary', secondary);
        root.style.setProperty('--color-accent', accent);
        
        return () => {
            root.style.removeProperty('--color-primary');
            root.style.removeProperty('--color-secondary');
            root.style.removeProperty('--color-accent');
        };
    }, [primary, secondary, accent]);

    const applyPreset = (preset: typeof PRESET_PALETTES[0]) => {
        setPrimary(preset.primary);
        setSecondary(preset.secondary);
        setAccent(preset.accent);
    };

    const handleLogoNative = async () => {
        if (!orgId) return;

        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos
            });

            if (!image.webPath) {
                throw new Error("No se pudo obtener la imagen");
            }

            setUploading(true);
            setError('');

            const response = await fetch(image.webPath);
            const blob = await response.blob();
            
            if (blob.size > 2 * 1024 * 1024) {
                setError('El logo debe pesar menos de 2MB.');
                setUploading(false);
                return;
            }

            const ext = image.format || 'jpg';
            const path = `logos/${orgId}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('branding')
                .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('branding')
                .getPublicUrl(path);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setLogoUrl(publicUrl);
            
            // Auto guardamos el cambio
            const { error: dbError } = await supabase
                .from('organizaciones')
                .update({ logo_url: publicUrl })
                .eq('id', orgId);

            if (dbError) throw dbError;

            setSuccess('Logo guardado exitosamente.');
            setTimeout(() => setSuccess(''), 3000);
            refreshBranding();
        } catch (err: any) {
            // Ignoramos si el usuario cancela la selección de imagen (phrases comunes en iOS/Android)
            const cancelPhrases = ['User cancelled', 'No image picked', 'Picking cancelled'];
            const isCancel = err.message && cancelPhrases.some(phrase => err.message.includes(phrase));
            
            if (isCancel) return;
            
            setError(err instanceof Error ? err.message : 'Error al subir el logo.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!orgId) return;
        setSaving(true);
        setError('');
        try {
            const { error: updateError } = await supabase
                .from('organizaciones')
                .update({
                    color_primario: primary,
                    color_secundario: secondary,
                    color_acento: accent,
                    ...(logoUrl ? { logo_url: logoUrl } : {}),
                })
                .eq('id', orgId);

            if (updateError) throw updateError;
            setSuccess('Configuracion guardada. Los cambios son visibles de inmediato.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            refreshBranding();
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar la configuracion.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    const resetColors = () => {
        setPrimary('#6C63FF');
        setSecondary('#38BDF8');
        setAccent('#F472B6');
    };

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate('/admin/settings')} aria-label="Volver">←</button>
                    <div className="flex-1 ml-md">
                        <h1>🎨 Marca</h1>
                        <p className="subtitle">Identidad visual de {orgName || 'tu organización'}</p>
                    </div>
                    {onSignOut && (
                        <button
                            onClick={() => {
                                if (confirm('¿Cerrar sesión?')) {
                                    onSignOut();
                                }
                            }}
                            className="btn btn-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', borderRadius: '10px', padding: '8px 12px' }}
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                        >
                            🚪
                        </button>
                    )}
                </div>
            </header>

            <main className="page" style={{ paddingBottom: '120px' }}>
                {/* Feedback */}
                {success && (
                    <div className="success-banner" style={{ marginBottom: '16px' }}>
                        {success}
                    </div>
                )}
                {error && (
                    <div className="error-message-panel" style={{ marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                {/* Logo Section */}
                <section className="brand-section">
                    <h2 className="brand-section-title">🖼️ Logo Institucional</h2>
                    <div className="logo-upload-area">
                        <div className="logo-preview-container">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo actual"
                                    className="logo-preview-img"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            {!logoUrl && (
                                <div className="logo-preview-placeholder">
                                    <span style={{ fontSize: '2.5rem' }}>🏫</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Sin logo</span>
                                </div>
                            )}
                        </div>
                        <div className="logo-upload-info">
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                                PNG, JPG o SVG. Máx. 2MB.<br />
                                Se mostrará en el header autenticado.
                            </p>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={handleLogoNative}
                                disabled={uploading}
                            >
                                {uploading ? <><div className="spinner spinner-sm" /> Subiendo...</> : '📤 Subir Logo'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Color Palette Presets */}
                <section className="brand-section">
                    <h2 className="brand-section-title">🎨 Paletas Prediseñadas</h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                        Selecciona una paleta o personaliza los colores manualmente abajo.
                    </p>
                    <div className="palette-grid">
                        {PRESET_PALETTES.map(palette => (
                            <button
                                key={palette.name}
                                className="palette-card"
                                onClick={() => applyPreset(palette)}
                                style={{
                                    border: primary === palette.primary
                                        ? `2px solid ${palette.primary}`
                                        : '2px solid var(--color-border)',
                                }}
                            >
                                <div className="palette-swatches">
                                    {palette.preview.map((color, i) => (
                                        <div
                                            key={i}
                                            className="palette-swatch"
                                            style={{ background: color }}
                                        />
                                    ))}
                                </div>
                                <p className="palette-name">{palette.name}</p>
                                <p className="palette-desc">{palette.description}</p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Manual Color Pickers */}
                <section className="brand-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 className="brand-section-title" style={{ margin: 0 }}>🖌️ Colores Personalizados</h2>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={resetColors}
                            style={{ fontSize: '0.75rem' }}
                        >
                            ↩️ Reset
                        </button>
                    </div>

                    <div className="color-pickers-grid">
                        {/* Primary */}
                        <div className="color-picker-item">
                            <div className="color-swatch-big" style={{ background: primary }} />
                            <div className="color-picker-info">
                                <label className="form-label" htmlFor="color-primary">Primario</label>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                                    Botones, Nav activo
                                </p>
                                <input
                                    id="color-primary"
                                    type="color"
                                    value={primary}
                                    onChange={e => setPrimary(e.target.value)}
                                    className="color-input"
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ fontSize: '0.8rem', padding: '6px 10px', marginTop: '6px' }}
                                    value={primary}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setPrimary(val);
                                    }}
                                    maxLength={7}
                                    placeholder="#000000"
                                />
                            </div>
                        </div>

                        {/* Secondary */}
                        <div className="color-picker-item">
                            <div className="color-swatch-big" style={{ background: secondary }} />
                            <div className="color-picker-info">
                                <label className="form-label" htmlFor="color-secondary">Secundario</label>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                                    Acentos, badges
                                </p>
                                <input
                                    id="color-secondary"
                                    type="color"
                                    value={secondary}
                                    onChange={e => setSecondary(e.target.value)}
                                    className="color-input"
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ fontSize: '0.8rem', padding: '6px 10px', marginTop: '6px' }}
                                    value={secondary}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setSecondary(val);
                                    }}
                                    maxLength={7}
                                    placeholder="#000000"
                                />
                            </div>
                        </div>

                        {/* Accent */}
                        <div className="color-picker-item">
                            <div className="color-swatch-big" style={{ background: accent }} />
                            <div className="color-picker-info">
                                <label className="form-label" htmlFor="color-accent">Terciario / Acento</label>
                                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                                    Highlights, notificaciones
                                </p>
                                <input
                                    id="color-accent"
                                    type="color"
                                    value={accent}
                                    onChange={e => setAccent(e.target.value)}
                                    className="color-input"
                                />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ fontSize: '0.8rem', padding: '6px 10px', marginTop: '6px' }}
                                    value={accent}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setAccent(val);
                                    }}
                                    maxLength={7}
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Live Preview */}
                <section className="brand-section">
                    <h2 className="brand-section-title">👁️ Vista Previa</h2>
                    <div className="preview-card">
                        <div className="preview-header" style={{ background: primary }}>
                            {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '28px', borderRadius: '6px' }} />}
                            <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                                {orgName || 'Mi Organización'}
                            </span>
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button style={{
                                background: primary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 18px',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                            }}>
                                Botón Primario
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{
                                    background: secondary,
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                }}>Badge Secundario</span>
                                <span style={{
                                    background: accent,
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '4px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                }}>Acento</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Fixed Save Button */}
            <div className="fixed-save-bar">
                <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <div className="spinner spinner-sm" /> : '💾 Guardar Configuración de Marca'}
                </button>
            </div>

            <style>{`
                .brand-section {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 16px;
                }
                .brand-section-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin-bottom: 16px;
                }
                .logo-upload-area {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .logo-preview-container {
                    width: 90px;
                    height: 90px;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 2px dashed var(--color-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--color-bg);
                    flex-shrink: 0;
                }
                .logo-preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .logo-preview-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }
                .logo-upload-info { flex: 1; }
                .palette-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                .palette-card {
                    background: var(--color-bg);
                    border-radius: 12px;
                    padding: 14px 12px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .palette-card:active { transform: scale(0.97); }
                .palette-swatches {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 8px;
                }
                .palette-swatch {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .palette-name {
                    font-size: 0.8rem;
                    font-weight: 700;
                    margin-bottom: 2px;
                }
                .palette-desc {
                    font-size: 0.68rem;
                    color: var(--color-text-secondary);
                    line-height: 1.3;
                }
                .color-pickers-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .color-picker-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                }
                .color-swatch-big {
                    width: 56px;
                    height: 56px;
                    border-radius: 12px;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    margin-top: 4px;
                }
                .color-picker-info { flex: 1; }
                .color-input {
                    appearance: none;
                    width: 100%;
                    height: 36px;
                    border-radius: 8px;
                    border: 1px solid var(--color-border);
                    padding: 2px;
                    background: transparent;
                    cursor: pointer;
                    margin-top: 6px;
                }
                .color-input::-webkit-color-swatch-wrapper { padding: 0; border-radius: 6px; }
                .color-input::-webkit-color-swatch { border: none; border-radius: 6px; }
                .preview-card {
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                }
                .preview-header {
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .fixed-save-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 16px;
                    background: var(--color-bg);
                    border-top: 1px solid var(--color-border);
                    backdrop-filter: blur(12px);
                }
                .success-banner {
                    background: rgba(34,197,94,0.15);
                    border: 1px solid rgba(34,197,94,0.4);
                    color: #16a34a;
                    border-radius: 10px;
                    padding: 12px 16px;
                    font-weight: 600;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
}
