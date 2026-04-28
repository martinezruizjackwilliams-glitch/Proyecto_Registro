import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGruposDocente } from '../services/attendance';
import type { GrupoClase } from '../types';

export default function SelectClassScanPage() {
    const navigate = useNavigate();
    const [grupos, setGrupos] = useState<GrupoClase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGrupos();
    }, []);

    const loadGrupos = async () => {
        try {
            const data = await getGruposDocente();
            setGrupos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate('/', { replace: true })} aria-label="Volver">←</button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>Seleccionar Clase</h1>
                        <p className="subtitle">¿A qué clase vas a tomar asistencia?</p>
                    </div>
                </div>
            </header>

            <main className="page">
                {loading ? (
                    <div className="loading-screen">
                        <div className="spinner" />
                    </div>
                ) : grupos.length === 0 ? (
                    <div className="empty-state">
                        <img src={new URL('../assets/illustrations/empty-classes.png', import.meta.url).href} alt="No hay clases" className="empty-state-img" />
                        <h3>No tienes clases</h3>
                        <p>Crea una clase primero</p>
                    </div>
                ) : (
                    grupos.map((grupo) => (
                        <div
                            key={grupo.id}
                            className="card card-clickable"
                            onClick={() => navigate(`/scan/${grupo.id}`)}
                            style={{ marginBottom: 'var(--space-md)' }}
                        >
                            <h3 className="card-title">{grupo.nombre_asignatura}</h3>
                            {grupo.codigo_grupo && (
                                <p className="card-subtitle">Grupo: {grupo.codigo_grupo}</p>
                            )}
                            <div className="card-meta">
                                <span>🕐 {grupo.horario}</span>
                                <span>•</span>
                                <span>Tolerancia: {grupo.tolerancia_min} min</span>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
