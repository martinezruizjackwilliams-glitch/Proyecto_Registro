import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGrupoClase } from '../services/attendance';
import { supabase } from '../services/supabase';
import { useBranding } from '../contexts/BrandingContext';
import type { Carrera, Modalidad, Sede } from '../types';

interface CreateClassPageProps {
    userId: string;
}

// Convert 24h time string to 12h format and period
const to12Hour = (time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return { hour, minute: m, period };
};

// Convert 12h components back to 24h time string
const to24Hour = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
    let h = hour;
    if (period === 'PM' && hour !== 12) h += 12;
    if (period === 'AM' && hour === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

export default function CreateClassPage({ userId }: CreateClassPageProps) {
    const navigate = useNavigate();
    const { orgId, orgName, nomenclatura } = useBranding();

    const [nombreModulo, setNombreModulo] = useState('');
    const [idCarrera, setIdCarrera] = useState<string | number>('');
    const [idModalidad, setIdModalidad] = useState<string | number>('');
    const [codigoGrupo, setCodigoGrupo] = useState('');
    const [dias, setDias] = useState<string[]>([]);
    
    // Time state with AM/PM
    const [horaInicio24, setHoraInicio24] = useState('08:00');
    const [periodoInicio, setPeriodoInicio] = useState<'AM' | 'PM'>('AM');
    const [horaFin24, setHoraFin24] = useState('10:00');
    const [periodoFin, setPeriodoFin] = useState<'AM' | 'PM'>('PM');
    
    const [idSede, setIdSede] = useState('');
    const [aula, setAula] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Catálogos dinámicos (filtrados por org via RLS)
    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [modalidades, setModalidades] = useState<Modalidad[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(true);

    // Sync AM/PM when component loads
    useEffect(() => {
        const inicio = to12Hour(horaInicio24);
        setPeriodoInicio(inicio.period);
        const fin = to12Hour(horaFin24);
        setPeriodoFin(fin.period);
    }, []);

    useEffect(() => {
        let mounted = true;
        fetchCatalogos();
        return () => { mounted = false; };
    }, [orgId]);

    const fetchCatalogos = async () => {
        if (!orgId) return;
        setCatalogLoading(true);
        try {
            const [carrerasRes, modalidadesRes, sedesRes] = await Promise.all([
                supabase.from('carreras').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
                supabase.from('modalidades').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
                supabase.from('sedes').select('id, nombre, id_organizacion').eq('id_organizacion', orgId).order('nombre'),
            ]);

            if (carrerasRes.error) throw carrerasRes.error;
            if (modalidadesRes.error) throw modalidadesRes.error;
            if (sedesRes.error) throw sedesRes.error;

            setCarreras(carrerasRes.data || []);
            setModalidades(modalidadesRes.data || []);
            setSedes(sedesRes.data || []);

            if (sedesRes.data && sedesRes.data.length === 1) {
                setIdSede(sedesRes.data[0].id);
            }
        } catch (err) {
            setError('No se pudieron cargar los catálogos. Verifique su conexión.');
        } finally {
            setCatalogLoading(false);
        }
    };

    const toggleDia = (dia: string) => {
        setDias(prev =>
            prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!idCarrera || !idModalidad) {
            setError('Por favor seleccione una carrera y modalidad.');
            return;
        }
        if (!idSede) {
            setError(`Por favor seleccione una ${nomenclatura.sede.toLowerCase()}.`);
            return;
        }
        if (dias.length === 0) {
            setError('Por favor seleccione al menos un día de clase.');
            return;
        }
        if (horaFin24 <= horaInicio24) {
            setError('La hora de fin debe ser posterior a la hora de inicio.');
            return;
        }

        setLoading(true);
        try {
            const inicio12 = to12Hour(horaInicio24);
            const fin12 = to12Hour(horaFin24);
            const formatTime12 = (hour: number, min: number, period: string) => 
                `${hour}:${min.toString().padStart(2, '0')} ${period}`;
            
            const horarioString = `${dias.join(', ')} ${formatTime12(inicio12.hour, inicio12.minute, periodoInicio)} - ${formatTime12(fin12.hour, fin12.minute, periodoFin)}`;

            const formatTime = (timeStr: string) => {
                if (!timeStr) return null;
                const parts = timeStr.trim().split(':');
                if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
                if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
                return null;
            };

            // Resolver nombre de sede seleccionada para campo legado
            const sedeSeleccionada = sedes.find(s => s.id === idSede);
            const sedeNombre = sedeSeleccionada?.nombre || 'Sin Sede';

            // Convertir a formato 24h para guardar en BD
            const horaInicioFinal = to24Hour(inicio12.hour, inicio12.minute, periodoInicio);
            const horaFinFinal = to24Hour(fin12.hour, fin12.minute, periodoFin);

            const grupo = await createGrupoClase({
                id_docente: userId,
                nombre_asignatura: nombreModulo.trim(),
                id_carrera: String(idCarrera),
                id_modalidad: String(idModalidad),
                codigo_grupo: codigoGrupo.trim() || null,
                horario: horarioString,
                dias: dias,
                hora_inicio: `${horaInicioFinal}:00`,
                hora_fin: `${horaFinFinal}:00`,
                tolerancia_min: 15,
                id_sede: idSede,
                sede_legado: sedeNombre,
                sede: sedeNombre,
                aula: aula.trim() || 'Sin Aula',
            });
            navigate(`/clase/${grupo.id}`, { replace: true });
        } catch (err) {
            console.error('Error guardando clase:', err);
            setError(err instanceof Error ? err.message : 'Error al crear el módulo.');
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
                        <h1>Nuevo Módulo</h1>
                        <p className="subtitle">{orgName || 'Tu organización'}</p>
                    </div>
                </div>
            </header>

            <main className="page">
                {catalogLoading ? (
                    <div className="loading-screen">
                        <div className="spinner" />
                        <p className="text-secondary">Cargando catálogos...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="modulo">Nombre del Módulo *</label>
                            <input
                                id="modulo"
                                className="form-input"
                                type="text"
                                placeholder={`Ej. Introducción a ${nomenclatura.carrera}`}
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
                            {carreras.length === 0 && (
                                <p className="form-hint">⚠️ No hay carreras configuradas. <span
                                    className="link-style"
                                    onClick={() => navigate('/admin/settings')}
                                >Ir a Configuración</span></p>
                            )}
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
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        id="hora-inicio"
                                        className="form-input"
                                        type="time"
                                        value={horaInicio24}
                                        onChange={(e) => {
                                            setHoraInicio24(e.target.value);
                                            const t = to12Hour(e.target.value);
                                            setPeriodoInicio(t.period);
                                        }}
                                        required
                                        style={{ flex: 2 }}
                                    />
                                    <select
                                        className="form-input"
                                        value={periodoInicio}
                                        onChange={(e) => setPeriodoInicio(e.target.value as 'AM' | 'PM')}
                                        style={{ flex: 1, maxWidth: '70px' }}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="hora-fin">Hora de Fin</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        id="hora-fin"
                                        className="form-input"
                                        type="time"
                                        value={horaFin24}
                                        onChange={(e) => {
                                            setHoraFin24(e.target.value);
                                            const t = to12Hour(e.target.value);
                                            setPeriodoFin(t.period);
                                        }}
                                        required
                                        style={{ flex: 2 }}
                                    />
                                    <select
                                        className="form-input"
                                        value={periodoFin}
                                        onChange={(e) => setPeriodoFin(e.target.value as 'AM' | 'PM')}
                                        style={{ flex: 1, maxWidth: '70px' }}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
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
                                <select
                                    id="sede"
                                    className="form-input"
                                    value={idSede}
                                    onChange={(e) => setIdSede(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione una {nomenclatura.sede.toLowerCase()}</option>
                                    {sedes.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                                {sedes.length === 0 && (
                                    <p className="form-hint">No hay {nomenclatura.sede.toLowerCase()} configuradas. <span
                                        className="link-style"
                                        onClick={() => navigate('/admin/settings')}
                                    >Ir a Configuración</span></p>
                                )}
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

                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? <div className="spinner spinner-sm" /> : '✅ Crear Módulo'}
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}
