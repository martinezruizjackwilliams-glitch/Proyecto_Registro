import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCodeLib from 'qrcode';
import QRCode from 'react-qr-code';
import { getMatriculasGrupo, getGruposDocente } from '../services/attendance';
import type { Matricula, Estudiante } from '../types';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { handleShareQR } from '../utils/shareUtils';
import { useBranding } from '../contexts/BrandingContext';

// ── Identity Card Component (used for screen + PDF capture) ──
function IdentityCard({
    estudiante,
    grupoName,
    grupoCodigo,
    size = 'screen',
}: {
    estudiante: Estudiante;
    grupoName: string;
    grupoCodigo?: string | null;
    size?: 'screen' | 'pdf';
}) {
    const isSmall = size === 'pdf';
    const branding = useBranding();
    const orgName = branding.orgName;
    const primary = branding.primaryColor || '#6C63FF';
    const secondary = branding.secondaryColor || primary;
    const accent = branding.accentColor || '#FBC02D';
    
    return (
        <div
            style={{
                width: isSmall ? 340 : '100%',
                background: 'white',
                borderRadius: isSmall ? 0 : 16,
                overflow: 'hidden',
                boxShadow: isSmall ? 'none' : '0 4px 20px rgba(0,0,0,0.12)',
                fontFamily: "'Inter', 'Roboto', sans-serif",
                border: '1px solid #e0e0e0',
            }}
        >
            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                padding: '12px 16px 8px',
                borderBottom: `3px solid ${accent}`,
                textAlign: 'center',
            }}>
                <p style={{ color: accent, fontWeight: 800, fontSize: 13, margin: 0, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {orgName || 'SENTINEL'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, margin: '2px 0 0', letterSpacing: 0.3 }}>
                    CREDENCIAL DE ASISTENCIA
                </p>
            </div>

            {/* Class name */}
            <div style={{
                background: '#F5F7FA',
                padding: '6px 16px',
                borderBottom: '1px solid #e0e0e0',
                textAlign: 'center',
            }}>
                <p style={{ fontSize: 11, color: '#546E7A', margin: 0 }}>
                    {grupoName}{grupoCodigo ? ` · ${grupoCodigo}` : ''}
                </p>
            </div>

            {/* QR Code */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'center',
                background: 'white',
            }}>
                <div style={{
                    padding: 8,
                    background: 'white',
                    border: `2px solid ${primary}`,
                    borderRadius: 8,
                }}>
                    <QRCode
                        value={estudiante.carnet}
                        size={isSmall ? 100 : 140}
                        level="M"
                        fgColor={primary}
                    />
                </div>
            </div>

            {/* Student Info */}
            <div style={{
                padding: '8px 16px 12px',
                textAlign: 'center',
                borderTop: '1px solid #e0e0e0',
            }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: primary, margin: '0 0 4px' }}>
                    {estudiante.nombre_completo}
                </p>
                <p style={{ fontSize: 12, color: '#546E7A', margin: 0 }}>
                    Carnet: <strong>{estudiante.carnet}</strong>
                    {estudiante.sexo && (
                        <span style={{ marginLeft: 8, color: estudiante.sexo === 'M' ? '#1565C0' : '#880E4F' }}>
                            {estudiante.sexo === 'M' ? '♂' : '♀'}
                        </span>
                    )}
                </p>
                {estudiante.carrera && (
                    <p style={{ fontSize: 10, color: '#90A4AE', margin: '4px 0 0' }}>{estudiante.carrera}</p>
                )}
            </div>

            {/* Footer */}
            <div style={{
                background: primary,
                padding: '5px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <p style={{ fontSize: 9, color: accent, margin: 0, fontWeight: 600 }}>SENTINEL</p>
                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'monospace' }}>
                    {estudiante.id.substring(0, 8).toUpperCase()}
                </p>
            </div>
        </div>
    );
}

// ── Main Page ──
export default function QRCardsPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [grupoName, setGrupoName] = useState('');
    const [grupoCodigo, setGrupoCodigo] = useState<string | null>('');
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [loading, setLoading] = useState(true);
    const [sharingId, setSharingId] = useState<string | null>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { orgName } = useBranding();

    useEffect(() => {
        if (grupoId) {
            loadData();
            loadGrupo();
        }
    }, [grupoId]);

    const loadGrupo = async () => {
        if (!grupoId) return;
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(x => x.id === grupoId);
            if (g) {
                setGrupoName(g.nombre_asignatura);
                setGrupoCodigo(g.codigo_grupo || null);
            }
        } catch (err) {
            console.error('Error loading class data', err);
        }
    };

    const loadData = async () => {
        if (!grupoId) return;
        try {
            const data = await getMatriculasGrupo(grupoId);
            setMatriculas(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Capture card to base64 PNG and download / share ──
    const captureCardAsBase64 = async (estudianteId: string): Promise<string | null> => {
        const el = cardRefs.current[estudianteId];
        if (!el) return null;

        // Dynamically import html2canvas only when needed
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(el, {
                backgroundColor: '#ffffff',
                scale: 3,
                useCORS: true,
                logging: false,
            });
            // Returns a base64 Data URL, e.g. "data:image/png;base64,iVBORw0KGgo..."
            const dataUrl = canvas.toDataURL('image/png');
            // Remove the data:image/png;base64, prefix to just get the base64 string
            return dataUrl.split(',')[1];
        } catch (err) {
            console.error('html2canvas error', err);
            return null;
        }
    };

    /**
     * Carnet Virtual: Captura el div, lo guarda en caché como .jpg y lo comparte
     * vía Share nativo (WhatsApp, correo, etc.)
     */
    const handleShareCarnet = async (m: Matricula & { estudiante: Estudiante }) => {
        setSharingId(m.estudiante.id);
        try {
            // 1️⃣ Capturar el div del carnet como base64 (html2canvas scale:2 = alta calidad)
            const base64Data = await captureCardAsBase64(m.estudiante.id);
            if (!base64Data) {
                throw new Error('No se pudo capturar la imagen del carnet.');
            }

            // 2️⃣ Guardar la imagen en el directorio Cache del dispositivo
            const fileName = `carnet_${m.estudiante.carnet || m.estudiante.id}.jpg`;
            const writeResult = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });

            // 3️⃣ Compartir el archivo via Share nativo
            const shareText =
                `Hola ${m.estudiante.nombre_completo.split(' ')[0]}, ` +
                `te comparto tu Carnet Virtual de ${orgName || 'SENTINEL'}. ` +
                `Carnet: ${m.estudiante.carnet}. ` +
                `Presenta este código en cada clase para registrar tu asistencia.`;

            await Share.share({
                title: `Carnet Virtual — ${m.estudiante.nombre_completo}`,
                text: shareText,
                url: writeResult.uri,          // URI del archivo .jpg guardado en caché
                dialogTitle: 'Compartir Carnet Virtual con...',
            });

        } catch (err) {
            console.error('Error al compartir carnet:', err);
            // Fallback: si el share falla (ej. web), abrir WhatsApp con texto
            if (m.estudiante.telefono) {
                const fallbackText = `Hola ${m.estudiante.nombre_completo.split(' ')[0]}, tu carnet de ${orgName || 'SENTINEL'} es: ${m.estudiante.carnet}`;
                window.open('whatsapp://send?phone=' + m.estudiante.telefono + '&text=' + encodeURIComponent(fallbackText), '_system');
            } else {
                alert('No se pudo compartir el carnet. Intenta de nuevo.');
            }
        } finally {
            setSharingId(null);
        }
    };


    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate(-1)} aria-label="Volver">←</button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>Credenciales QR</h1>
                        <p className="subtitle">{grupoName} · {matriculas.length} estudiantes</p>
                    </div>
                </div>
            </header>

            <main className="page">


                {matriculas.length === 0 ? (
                    <div className="empty-state">
                        <img src={new URL('../assets/illustrations/empty-students.png', import.meta.url).href} alt="Sin estudiantes" className="empty-state-img" />
                        <h3>Sin estudiantes</h3>
                        <p>Agrega estudiantes a esta clase primero</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                        {matriculas.map((m) => (
                            <div key={m.id}>
                                {/* The card div that will be captured */}
                                <div ref={(el) => { cardRefs.current[m.estudiante.id] = el; }}>
                                    <IdentityCard
                                        estudiante={m.estudiante}
                                        grupoName={grupoName}
                                        grupoCodigo={grupoCodigo}
                                        size="screen"
                                    />
                                </div>

                                {/* Botón: Captura imagen del carnet y comparte nativo */}
                                <button
                                    className="btn btn-secondary btn-block btn-sm"
                                    onClick={() => handleShareCarnet(m)}
                                    disabled={sharingId === m.estudiante.id}
                                    style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {sharingId === m.estudiante.id ? (
                                        <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generando imagen...</>
                                    ) : (
                                        <>📤 Compartir Carnet</>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
