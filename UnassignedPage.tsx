import { motion } from 'framer-motion';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import logoUrl from '../assets/ic_launcher.png';

interface UnassignedPageProps {
    onSignOut: () => void;
}

export default function UnassignedPage({ onSignOut }: UnassignedPageProps) {
    const { logoUrl: orgLogo, refreshBranding, loading } = useBranding();
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        refreshBranding();
        setTimeout(() => setRefreshing(false), 1000);
    };

    const handleSignOut = () => {
        onSignOut();
        window.location.href = '/';
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--color-background, #0f172a)',
            color: 'var(--color-text, #f1f5f9)',
            textAlign: 'center',
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1.5rem',
                    maxWidth: '400px',
                }}
            >
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'var(--color-primary, #6C63FF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(108, 99, 255, 0.3)',
                }}>
                    <img
                        src={orgLogo || logoUrl}
                        alt="SENTINEL"
                        style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>

                <div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        margin: 0,
                        marginBottom: '0.5rem',
                    }}>
                        Cuenta Creada Exitosamente
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        Su perfil aún no ha sido vinculado a ninguna Institución.
                    </p>
                </div>

                <div style={{
                    background: 'var(--color-surface, #1e293b)',
                    border: '1px solid var(--color-border, #334155)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    width: '100%',
                }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: '1rem',
                    }}>
                        ⚠️
                    </div>
                    <h2 style={{
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        margin: 0,
                        marginBottom: '0.75rem',
                        color: '#f59e0b',
                    }}>
                        Acceso Restringido
                    </h2>
                    <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        margin: 0,
                        lineHeight: 1.6,
                    }}>
                        No puede acceder al dashboard ni configurar la organización hasta que un Administrador vincule su cuenta a una institución.
                    </p>
                </div>

                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    padding: '1rem',
                    width: '100%',
                }}>
                    <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary, #94a3b8)',
                        margin: 0,
                        lineHeight: 1.5,
                    }}>
                        <strong style={{ color: 'var(--color-primary, #6C63FF)' }}>Próximo paso:</strong><br />
                        Contacte al Administrador de su institución para que habilite su espacio de trabajo en SENTINEL.
                    </p>
                </div>

                <div style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    width: '100%',
                    textAlign: 'left',
                }}>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>DEBUG INFO</p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, wordBreak: 'break-all' }}>
                        <strong>Email:</strong> {user?.email || 'No disponible'}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                        <strong>Cargando:</strong> {loading ? 'Sí' : 'No'}
                    </p>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: 'var(--color-primary, #6C63FF)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: refreshing || loading ? 'wait' : 'pointer',
                        opacity: refreshing || loading ? 0.7 : 1,
                    }}
                >
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>

                <button
                    onClick={handleSignOut}
                    style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        color: '#ef4444',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Cerrar Sesión
                </button>

                <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary, #64748b)',
                    margin: 0,
                    marginTop: '1rem',
                }}>
                    SENTINEL — Sistema de Control de Asistencia
                </p>
            </motion.div>
        </div>
    );
}
