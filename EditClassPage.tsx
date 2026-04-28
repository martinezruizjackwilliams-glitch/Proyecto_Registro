import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGruposDocente, updateGrupoClase } from '../services/attendance';
import { supabase } from '../services/supabase';
import { useBranding } from '../contexts/BrandingContext';
import type { GrupoClase, Carrera, Modalidad, Sede } from '../types';

export default function EditClassPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { orgId, nomenclatura } = useBranding();

    const [nombreModulo, setNombreModulo] = useState('');
    const [idCarrera, setIdCarrera] = useState<string | number>('');
    const [idModalidad, setIdModalidad] = useState<string | number>('');
    const [codigoGrupo, setCodigoGrupo] = useState('');
    const [dias, setDias] = useState<string[]>([]);
    const [horaInicio, setHoraInicio] = useState('08:00');
    const [horaFin, setHoraFin] = useState('10:00');
    const [idSede, setIdSede] = useState('');
    const [sedeLegado, setSedeLegado] = useState<string | null>(null); // para clases antiguas
    const [aula, setAula] = useState('');

    // Catálogos dinámicos
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [modalidades, setModalidades] = useState<Modalidad[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    useEffect(() => {
        let mounted = true;
        loadData();
        return () => { mounted = false; };
    }, [grupoId, orgId]);

    const loadCatalogos = async () => {
        if (!orgId) return;
        try {
            const [carrerasRes, modalidadesRes, sedesRes] = await Promise.all([
                supabase.from('carreras').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
                supabase.from('modalidades').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
                supabase.from('sedes').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
            ]);
            if (!carrerasRes.error) setCarreras(carrerasRes.data || []);
            if (!modalidadesRes.error) setModalidades(modalidadesRes.data || []);
            if (!sedesRes.error) setSedes(sedesRes.data || []);
        } catch (err) {
            setError('Error al cargar catálogos');
        }
    };

    const loadData = async () => {
        if (!grupoId) return;
        setLoading(true);
        try {
            await loadCatalogos();

            // Obtener datos del grupo directamente
            const { data: grupoData, error: grupoError } = await supabase
                .from('grupos_clase')
                .select('*')
                .eq('id', grupoId)
                .single();

            if (grupoError || !grupoData) {
                setError('Módulo no encontrado');
                return;
            }

            const g = grupoData as GrupoClase;
            setNombreModulo(g.nombre_asignatura);
            setIdCarrera(g.id_carrera || '');
            setIdModalidad(g.id_modalidad || '');
            setCodigoGrupo(g.codigo_grupo || '');
            setDias(g.dias || []);
            setHoraInicio(g.hora_inicio ? g.hora_inicio.substring(0, 5) : '08:00');
            setHoraFin(g.hora_fin ? g.hora_fin.substring(0, 5) : '10:00');
            setAula(g.aula || '');

            // Manejar sede: nueva FK o texto legado
            if (g.id_sede) {
                setIdSede(g.id_sede);
            } else {
                // Clase antigua: guardar texto legado para mostrarlo
                setSedeLegado(g.sede_legado || g.sede || null);
            }
        } catch (err) {
            setError('Error al cargar el módulo');
        } finally {
            setLoading(false);
        }
    };

    const toggleDia = (dia: string) => {
        setDias(prev =>
            prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grupoId) return;
        setError('');

        if (!idCarrera || !idModalidad) {
            setError('Por favor seleccione una carrera y modalidad.');
            return;
        }
        if (!idSede) {
            setError(`Por favor seleccione una ${nomenclatura.sede.toLowerCase()}. Si es una clase antigua, debe migrarla seleccionando una.`);
            return;
        }
        if (dias.length === 0) {
            setError('Por favor seleccione al menos un día de clase.');
            return;
        }
        if (horaFin <= horaInicio) {
            setError('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }

        setSaving(true);
        try {
            const horarioString = `${dias.join(', ')} ${horaInicio} - ${horaFin}`;
            const sedeSeleccionada = sedes.find(s => s.id === idSede);
            const sedeNombre = sedeSeleccionada?.nombre || sedeLegado || 'Sin Sede';

            await updateGrupoClase(grupoId, {
                nombre_asignatura: nombreModulo,
                id_carrera: idCarrera,
                id_modalidad: idModalidad,
                codigo_grupo: codigoGrupo || null,
                horario: horarioString,
                dias: dias,
                hora_inicio: horaInicio + ':00',
                hora_fin: horaFin + ':00',
                tolerancia_min: 0,
                id_sede: idSede,
                sede_legado: sedeNombre,
                sede: sedeNombre,
                aula,
            });
            setSuccess('Clase actualizada correctamente.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar la clase');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Cargando datos...</p>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate(-1)} aria-label="Volver">←</button>
                    <div className="flex-1 ml-md">
                        <h1>Editar Clase</h1>
                        <p className="subtitle">Configura tu grupo de clase</p>
                    </div>
                </div>
            </header>

            <main className="page">
                {success && (
                    <div className="success-banner" style={{ marginBottom: '16px' }}>
                        ✅ {success}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="modulo">Nombre del Módulo *</label>
                        <input
                            id="modulo"
                            className="form-input"
                            type="text"
                            placeholder="Ej. Anatomía Veterinaria I"
                            value={nombreModulo}
                            onChange={(e) => setNombreModulo(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="carrera">Carrera *</label>
                        <select
                            id="carrera"
                            className="form-input"
                            value={idCarrera}
                            onChange={(e) => setIdCarrera(e.target.value)}
                            required
                        >
                            <option value="">Seleccione una carrera</option>
                            {carreras.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group mb-lg">
                        <label className="form-label">Días de Clase *</label>
                        <div className="pill-container">
                            {diasSemana.map(dia => (
                                <button
                                    key={dia}
                                    type="button"
                                    onClick={() => toggleDia(dia)}
                                    className={`pill ${dias.includes(dia) ? 'pill-active' : ''}`}
                                >
                                    {dia.substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor="hora-inicio">Hora de Inicio</label>
                            <input
                                id="hora-inicio"
                                className="form-input"
                                type="time"
                                value={horaInicio}
                                onChange={(e) => setHoraInicio(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="hora-fin">Hora de Fin</label>
                            <input
                                id="hora-fin"
                                className="form-input"
                                type="time"
                                value={horaFin}
                                onChange={(e) => setHoraFin(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor="modalidad">Modalidad *</label>
                            <select
                                id="modalidad"
                                className="form-input"
                                value={idModalidad}
                                onChange={(e) => setIdModalidad(e.target.value)}
                                required
                            >
                                <option value="">Seleccione</option>
                                {modalidades.map((m) => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="codigo">Código Grupo</label>
                            <input
                                id="codigo"
                                className="form-input"
                                type="text"
                                placeholder="Ej. VET-26"
                                value={codigoGrupo}
                                onChange={(e) => setCodigoGrupo(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor="sede">{nomenclatura.sede} *</label>
                            {sedeLegado && !idSede && (
                                <p className="form-hint" style={{ color: 'var(--color-warning, #f59e0b)', marginBottom: '6px' }}>
                                    {nomenclatura.sede} anterior: <strong>{sedeLegado}</strong>. Selecciona la {nomenclatura.sede.toLowerCase()} actual para migrar.
                                </p>
                            )}
                            <select
                                id="sede"
                                className="form-input"
                                value={idSede}
                                onChange={(e) => setIdSede(e.target.value)}
                                required
                            >
                                <option value="">
                                    {sedeLegado && !idSede
                                        ? `Migrar desde "${sedeLegado}"...`
                                        : `Seleccione una ${nomenclatura.sede.toLowerCase()}`}
                                </option>
                                {sedes.map((s) => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="aula">Aula/Sala *</label>
                            <input
                                id="aula"
                                className="form-input"
                                type="text"
                                placeholder="Ej. Sala B-4"
                                value={aula}
                                onChange={(e) => setAula(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="error-message-panel">{error}</div>
                    )}

                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
                        {saving ? <div className="spinner spinner-sm" /> : '💾 Guardar Cambios'}
                    </button>
                </form>
            </main>
        </div>
    );
}
