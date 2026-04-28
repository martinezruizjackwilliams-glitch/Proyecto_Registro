import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getMatriculasGrupo, registrarAusentes, updateEstadoAsistencia, getAsistenciaGrupoFecha, getGruposDocente, getLocalISODate } from '../services/attendance';
import { sincronizarPendientes } from '../services/syncService';
import { supabase } from '../services/supabase';
import type { RegistroAsistencia, Estudiante, EstadoAsistencia, AttendanceSummary, GrupoClase } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';
import { AnimatedList, itemVariant } from '../components/AnimatedList';
import { Icon } from '../components/Icon';
import { motion } from 'framer-motion';
import QRCodeLib from 'qrcode';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { handleShareQR } from '../utils/shareUtils';

interface ClassSummaryPageProps {
    userName: string;
}



export default function ClassSummaryPage({ userName }: ClassSummaryPageProps) {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [scannedIds, setScannedIds] = useState<string[]>(location.state?.scannedIds || []);
    const [grupoName, setGrupoName] = useState('');
    const [records, setRecords] = useState<(RegistroAsistencia & { estudiante: Estudiante })[]>([]);
    const [grupo, setGrupo] = useState<GrupoClase | null>(null);
    const [summary, setSummary] = useState<AttendanceSummary>({ total: 0, presentes: 0, tardes: 0, ausentes: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    // Fix timezone issue: force Central America / local timezone
    const fechaClase = getLocalISODate();

    useEffect(() => {
        if (grupoId) {
            finalizeSession();
        }
    }, [grupoId]);

    const calcSummary = (
        allRecords: (RegistroAsistencia & { estudiante: Estudiante })[],
        totalMatriculados: number
    ): AttendanceSummary => {
        const total = totalMatriculados;
        let presentes = 0;
        let tarde = 0;
        let presentesH = 0;
        let presentesM = 0;

        // Count unique attendances per student (in case of duplicates)
        const counted = new Set();

        allRecords.forEach(record => {
            if (counted.has(record.id_estudiante)) return;
            counted.add(record.id_estudiante);

            if (record.estado === 'presente') {
                presentes++;
                const sexo = record.estudiante?.sexo;
                if (sexo === 'M') presentesH++;
                else if (sexo === 'F') presentesM++;
            } else if (record.estado === 'tarde') {
                tarde++;
                const sexo = record.estudiante?.sexo;
                if (sexo === 'M') presentesH++;
                else if (sexo === 'F') presentesM++;
            }
        });

        // Exact match logic
        const ausentes = total - (presentes + tarde);

        return {
            total,
            presentes,
            tardes: tarde,
            ausentes: ausentes > 0 ? ausentes : 0,
            presentesH,
            presentesM,
        };
    };

    const finalizeSession = async () => {
        if (!grupoId) return;
        try {
            // CONDITION 1: Prioritize uploading pending (offline) items first to avoid Race Conditions!
            await sincronizarPendientes();

            await registrarAusentes(grupoId, scannedIds, fechaClase);
            
            const grupos = await getGruposDocente();
            const g = grupos.find(x => x.id === grupoId);
            if (g) setGrupoName(g.nombre_asignatura);

            // CONDITION 2: Wait for accurate database state
            const [allRecords, matriculas, { data: grupoData }] = await Promise.all([
                getAsistenciaGrupoFecha(grupoId, fechaClase),
                getMatriculasGrupo(grupoId),
                supabase.from('grupos_clase').select('*').eq('id', grupoId).single()
            ]);
            setRecords(allRecords);
            setGrupo(grupoData);
            setSummary(calcSummary(allRecords, matriculas.length));
        } catch (err) {
            console.error('Error in finalizeSession:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeStatus = async (recordId: string, newStatus: EstadoAsistencia) => {
        try {
            await updateEstadoAsistencia(recordId, newStatus);
            const updated = records.map(r => r.id === recordId ? { ...r, estado: newStatus } : r);
            setRecords(updated);
            // Re-calculate with updated state
            const mattotal = summary.total; // preserve original matricula total
            setSummary(calcSummary(updated, mattotal));
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = (estudiante: Estudiante) => {
        if (!estudiante.telefono) {
            alert('El estudiante no tiene un número de teléfono registrado.');
            return;
        }
        // Use direct Deep Linking for WhatsApp
        window.open('whatsapp://send?phone=' + estudiante.telefono + '&text=Hola, tu registro fue exitoso.', '_system');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const queueStr = localStorage.getItem('offline_queue');
            if (!queueStr || queueStr === '[]') {
                alert('No hay datos pendientes por sincronizar.');
                setSaved(true);
                return;
            }

            const synced = await sincronizarPendientes();
            
            if (synced > 0) {
                alert(`Sincronización completa. ${synced} registros subidos.`);
                setSaved(true);
                // Reload data to show newly synced records
                finalizeSession();
            } else {
                alert('Fallo al sincronizar o la cola estaba vacía. Intente luego.');
            }
        } catch (error) {
            console.error('Error durante la sincronización', error);
            alert('Falló la sincronización. Asegúrate de tener conexión a Internet.');
        } finally {
            setSaving(false);
        }
    };

    const exportToExcel = async () => {
        if (records.length === 0) return;

        // Importación dinámica de XLSX para ahorrar memoria if needed, pero aquí ya está en el proyecto
        // Nota: En un entorno real se importaría arriba, pero para el snippet lo asumimos disponible
        const XLSX = await import('xlsx');

        const ws1Data = [
            ['RESUMEN DE ASISTENCIA'],
            ['Clase:', grupoName],
            ['Fecha:', fechaClase],
            [],
            ['Estadísticas'],
            ['Total Inscritos:', summary.total],
            ['Presentes:', summary.presentes],
            ['Llegadas Tarde:', summary.tardes],
            ['Ausentes:', summary.ausentes],
            ['Rendimiento:', `${Math.round(((summary.presentes + summary.tardes) / summary.total) * 100)}%`],
        ];

        const ws2Data = [
            ['N°', 'Estudiante', 'Carnet', 'Estado', 'Hora'],
            ...records.map((r, i) => [
                i + 1,
                r.estudiante?.nombre_completo || 'N/A',
                r.estudiante?.carnet || 'N/A',
                r.estado.toUpperCase(),
                new Date(r.fecha_hora_escaneo).toLocaleTimeString()
            ])
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws1Data), "Resumen");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws2Data), "Detalle");

        const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const fileName = `Resumen_${grupoName.replace(/\s+/g, '_')}_${fechaClase}.xlsx`;

        try {
            const path = fileName;
            await Filesystem.writeFile({
                path,
                data: excelBase64,
                directory: Directory.Cache
            });
            const uriResult = await Filesystem.getUri({
                directory: Directory.Cache,
                path
            });
            await Share.share({
                title: 'Exportar Asistencia',
                url: uriResult.uri,
            });
        } catch (err) {
            console.error('Error exportando Excel:', err);
        }
    };

    const compartirWhatsApp = () => {
        const now = new Date();
        const dia = String(now.getDate()).padStart(2, '0');
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const anio = String(now.getFullYear()).slice(-2);
        const fechaFormateada = `${dia}/${mes}/${anio}`;

        const nombreModulo = grupoName;
        const nombreAula = grupo?.aula || 'N/A';
        const codigoGrupo = grupo?.codigo_grupo || 'N/A';
        const totalMujeres = summary.presentesM || 0;
        const totalVarones = summary.presentesH || 0;
        const totalAsistencia = summary.presentes + summary.tardes;
        const nombreDocente = userName;

        const text = `Fecha ${fechaFormateada} Módulo: ${nombreModulo} Aula ${nombreAula} Grupo ${codigoGrupo} Mujeres: ${totalMujeres} Varones: ${totalVarones} Total: ${totalAsistencia} Docente: ${nombreDocente}`;

        window.open('whatsapp://send?text=' + encodeURIComponent(text), '_system');
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p style={{ color: 'var(--color-text-secondary)' }}>Finalizando sesión...</p>
            </div>
        );
    }

    return (
        <AnimatedPage className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate(-1)} aria-label="Volver">←</button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>Resumen</h1>
                        <p className="subtitle">{grupoName || 'Cargando...'}</p>
                    </div>
                </div>
            </header>

            <main className="page">
                {/* Stats with gender breakdown */}
                <div className="stats-grid">
                    <div className="stat-card stat-total" style={{ borderBottom: '4px solid var(--color-text-secondary)', background: 'var(--color-bg)' }}>
                        <p className="stat-number">{summary.total}</p>
                        <p className="stat-label">Total</p>
                    </div>
                    <div className="stat-card stat-present" style={{ borderBottom: '4px solid var(--color-success)', background: 'rgba(46,125,50,0.05)' }}>
                        <p className="stat-number" style={{ color: 'var(--color-success)' }}>{summary.presentes}</p>
                        <p className="stat-label">Presentes</p>
                        {(summary.presentesH! > 0 || summary.presentesM! > 0) && (
                            <p style={{ fontSize: '10px', marginTop: 2, opacity: 0.8 }}>
                                {summary.presentesH} H / {summary.presentesM} M
                            </p>
                        )}
                    </div>
                    <div className="stat-card stat-late" style={{ borderBottom: '4px solid #FBC02D', background: 'rgba(251,192,45,0.05)' }}>
                        <p className="stat-number" style={{ color: '#FBC02D' }}>{summary.tardes}</p>
                        <p className="stat-label">Llegadas Tarde</p>
                    </div>
                    <div className="stat-card stat-absent" style={{ borderBottom: '4px solid var(--color-error)', background: 'rgba(211,47,47,0.05)' }}>
                        <p className="stat-number" style={{ color: 'var(--color-error)' }}>{summary.ausentes}</p>
                        <p className="stat-label">Ausentes</p>
                    </div>
                </div>

                {/* Rendimiento General Progress Bar */}
                {summary.total > 0 && (
                    <div style={{ marginBottom: 'var(--space-lg)', padding: '0 var(--space-xs)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--font-size-xs)' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Rendimiento general</span>
                            <span style={{ fontWeight: 600 }}>{Math.round(((summary.presentes + summary.tardes) / summary.total) * 100)}%</span>
                        </div>
                        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#e0e0e0' }}>
                            <div style={{ width: `${((summary.presentes + summary.tardes) / summary.total) * 100}%`, background: 'var(--color-success)' }} />
                            <div style={{ width: `${(summary.ausentes / summary.total) * 100}%`, background: 'var(--color-error)' }} />
                        </div>
                    </div>
                )}



                {/* Student List */}
                <p className="section-title">Detalle de Asistencia</p>

                <AnimatedList>
                    {records.map((record) => (
                        <motion.li variants={itemVariant} key={record.id} className="list-item" style={{ position: 'relative' }}>
                            <div className="list-item-avatar" style={{
                                background: record.estado === 'presente'
                                    ? 'rgba(46,125,50,0.1)'
                                    : record.estado === 'tarde'
                                        ? 'rgba(251,192,45,0.15)'
                                        : 'rgba(211,47,47,0.1)',
                                color: record.estado === 'presente'
                                    ? 'var(--color-success)'
                                    : record.estado === 'tarde'
                                        ? '#E65100'
                                        : 'var(--color-error)',
                            }}>
                                {record.estado === 'presente' ? '✅' : record.estado === 'tarde' ? '⚠️' : '❌'}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-name">
                                    {record.estudiante?.nombre_completo || 'Sin nombre'}
                                    {record.estudiante?.sexo && (
                                        <span style={{
                                            marginLeft: 6,
                                            fontSize: '11px',
                                            color: record.estudiante.sexo === 'M' ? '#1565C0' : '#880E4F',
                                        }}>
                                            {record.estudiante.sexo === 'M' ? '♂' : '♀'}
                                        </span>
                                    )}
                                </div>
                                <div className="list-item-detail">
                                    {record.estudiante?.carnet || ''} •{' '}
                                    {new Date(record.fecha_hora_escaneo).toLocaleTimeString('es-NI', {
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </div>
                            </div>

                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => record.estudiante && handleShare(record.estudiante)}
                                style={{ color: '#25D366', border: 'none', background: 'transparent', padding: '4px' }}
                                aria-label="Compartir QR"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                                </svg>
                            </button>

                            <select
                                aria-label={`Cambiar estado para ${record.estudiante?.nombre_completo || 'estudiante'}`}
                                className="status-select"
                                value={record.estado}
                                onChange={(e) => handleChangeStatus(record.id, e.target.value as EstadoAsistencia)}
                                style={{
                                    color: record.estado === 'presente'
                                        ? 'var(--color-success)'
                                        : record.estado === 'tarde'
                                            ? '#E65100'
                                            : 'var(--color-error)',
                                }}
                            >
                                <option value="presente">Presente</option>
                                <option value="tarde">Tarde</option>
                                <option value="ausente">Ausente</option>
                            </select>
                        </motion.li>
                    ))}
                </AnimatedList>

                {/* Action Buttons */}
                <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {!saved ? (
                        <button
                            className="btn btn-primary btn-block btn-lg"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <><div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} /> Sincronizando...</>
                            ) : (
                                '☁️ Guardar y Sincronizar'
                            )}
                        </button>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-lg)',
                            background: 'rgba(46,125,50,0.1)',
                            borderRadius: 'var(--radius-lg)',
                            color: 'var(--color-success)',
                            fontWeight: 600,
                        }}>
                            ✅ Datos sincronizados correctamente
                        </div>
                    )}
                    <button className="btn btn-secondary btn-block flex items-center justify-center gap-2" onClick={() => navigate('/', { replace: true })}>
                        <Icon name="home" size={18} />
                        <span>Volver al Inicio</span>
                    </button>

                    {/* Botones de Exportación Solicitados */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                            onClick={exportToExcel}
                        >
                            📊 Excel
                        </button>
                        <button
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                            onClick={compartirWhatsApp}
                        >
                            💬 WhatsApp
                        </button>
                    </div>
                </div>
            </main>
        </AnimatedPage>
    );
}
