import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGruposDocente } from '../services/attendance';
import type { GrupoClase } from '../types';

export default function SelectClassListPage() {
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
                    <button className="back-button" onClick={() => navigate(-1)} aria-label="Volver">←</button>
                    <div className="flex-1 ml-md">
                        <h1>Lista de Alumnos</h1>
                        <p className="subtitle">Selecciona una clase para ver sus alumnos</p>
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
                            className="card card-clickable mb-lg"
                            onClick={() => navigate(`/add-students/${grupo.id}`)}
                        >
                            <h3 className="card-title">{grupo.nombre_asignatura}</h3>
                            {grupo.codigo_grupo && (
                                <p className="card-subtitle">Grupo: {grupo.codigo_grupo}</p>
                            )}
                            <div className="card-meta">
                                <span>🕐 {grupo.horario}</span>
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
