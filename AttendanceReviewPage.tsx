import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getGruposDocente, getMatriculasGrupo, registrarAsistenciaMasiva, getLocalISODate } from '../services/attendance';
import { LocalStorage } from '../utils/localStorage';
import type { GrupoClase, Matricula, Estudiante } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';

export default function AttendanceReviewPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as any || {};
    const scannedMatriculaIds = state.scannedMatriculaIds || [];

    // Selector de fecha para asistencia retroactiva
    const todayStr = getLocalISODate();
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const [selectedDate, setSelectedDate] = useState(state.selectedDate || todayStr);
    const isHistoricalMode = selectedDate !== todayStr;

    const [grupo, setGrupo] = useState<GrupoClase | null>(null);
    const [pendientes, setPendientes] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [procesados, setProcesados] = useState<{ id_matricula: string, estado: 'presente' | 'ausente' | 'tarde' }[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [grupoId]);

    const loadData = async () => {
        if (!grupoId) return;
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(g => g.id === grupoId);
            setGrupo(g || null);
            
            const allMats = await getMatriculasGrupo(grupoId);
            
            // Los que ya se marcaron (QR/NFC) se consideran procesados como 'presente'
            const alreadyProcessed = allMats
                .filter(m => scannedMatriculaIds.includes(m.id))
                .map(m => ({ id_matricula: m.id, estado: 'presente' as const }));
            
            setProcesados(alreadyProcessed);
            
            // Solo mostramos para revisión a los AUSENTES (no escaneados)
            const remaining = allMats.filter(m => !scannedMatriculaIds.includes(m.id));
            setPendientes(remaining);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (idMatricula: string, estado: 'presente' | 'ausente' | 'tarde') => {
        // Feedback háptico según acción
        if (estado === 'presente') await Haptics.impact({ style: ImpactStyle.Medium });
        else if (estado === 'ausente') await Haptics.impact({ style: ImpactStyle.Light });
        else await Haptics.impact({ style: ImpactStyle.Heavy });

        // Registrar acción
        setProcesados(prev => [...prev, { id_matricula: idMatricula, estado }]);
        
        // Quitar de la lista visual (con animación gracias a AnimatePresence en el listado)
        setPendientes(prev => prev.filter(p => p.id !== idMatricula));
    };

    const handleFinalize = async () => {
        if (!grupoId) return;
        setSaving(true);
        try {
            const fechaClase = selectedDate;
            const allMats = await getMatriculasGrupo(grupoId);
            
            // Mapear procesados a formato DB (id_estudiante, id_grupo, fecha_clase)
            const batch = procesados.map(p => {
                const mat = allMats.find(m => m.id === p.id_matricula);
                return {
                    id_estudiante: mat?.id_estudiante,
                    id_grupo: grupoId,
                    estado: p.estado,
                    fecha_clase: fechaClase,
                    fecha_hora_escaneo: new Date().toISOString()
                };
            }).filter(item => item.id_estudiante);

            // Marcar rezagados automáticamente como ausentes
            const procesadosIds = new Set(procesados.map(p => p.id_matricula));
            const rezagados = pendientes
                .filter(p => !procesadosIds.has(p.id))
                .map(p => ({
                    id_estudiante: p.id_estudiante,
                    id_grupo: grupoId,
                    estado: 'ausente' as const,
                    fecha_clase: fechaClase,
                    fecha_hora_escaneo: new Date().toISOString()
                }));

            const finalBatch = [...batch, ...rezagados];
            
            // Silencioso: el automáticamente maneja fallback a cola local
            await registrarAsistenciaMasiva(finalBatch);
            
            navigate(`/clase/${grupoId}`, { replace: true });
        } catch (err) {
            console.error('Error in handleFinalize, falling back to Offline Vault:', err);
            
            // RESILIENCIA OFFLINE: Si falla el guardado masivo, enviamos cada registro a la cola local
            try {
                const fechaClase = selectedDate;
                const procesadosIds = new Set(procesados.map(p => p.id_matricula));
                
                const allMats = await getMatriculasGrupo(grupoId);
                
                for (const mat of allMats) {
                    const p = procesados.find(x => x.id_matricula === mat.id);
                    const estado = p ? p.estado : 'ausente';
                    
                    await LocalStorage.addToQueue({
                        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
                        type: 'ADD_ATTENDANCE',
                        payload: {
                            id_estudiante: mat.id_estudiante,
                            id_grupo: grupoId,
                            estado: estado,
                            fecha_clase: fechaClase,
                            fecha_hora_escaneo: new Date().toISOString()
                        }
                    });
                }
                
                alert('Los registros se guardaron localmente y se sincronizarán cuando haya conexión.');
                navigate(`/clase/${grupoId}`, { replace: true });
            } catch (queueErr) {
                console.error('Critical failure: Could not even save to offline vault', queueErr);
                alert('Error crítico al guardar la asistencia.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!grupo) return <div className="empty-state"><h3>Clase no encontrada</h3></div>;

    return (
        <AnimatedPage>
            <div className="app-layout" style={{ background: 'var(--white)' }}>
                <header className="app-header header-no-shadow">
                    <div className="header-row">
                        <button className="back-button" onClick={() => navigate(-1)}>←</button>
                        <div className="flex-1 ml-md">
                            <h1 className="text-white">Revisión de Ausentes</h1>
                            <p className="subtitle text-gold">{grupo.nombre_asignatura}</p>
                        </div>
                        <div className="header-badge bg-primary-surface text-primary">
                            {pendientes.length} por revisar
                        </div>
                    </div>
                </header>

                {/* Selector de Fecha para Asistencia Retroactiva */}
                <div style={{
                    background: isHistoricalMode ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border, #e5e7eb)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    {isHistoricalMode && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            padding: '4px 16px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            ⚠️ MODO HISTÓRICO ACTIVO
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <span style={{ 
                            color: isHistoricalMode ? '#92400e' : '#374151', 
                            fontSize: '0.9rem', 
                            fontWeight: 600 
                        }}>
                            📅 Fecha de Clase:
                        </span>
                        <input
                            type="date"
                            value={selectedDate}
                            min={yearStart}
                            max={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                background: 'white',
                                border: `2px solid ${isHistoricalMode ? '#f59e0b' : '#d1d5db'}`,
                                borderRadius: '10px',
                                padding: '8px 14px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: '#1f2937',
                                cursor: 'pointer',
                            }}
                        />
                    </div>
                </div>

                <main className="page page-no-padding">
                    
                    <div className="swipe-list-container">
                        <AnimatePresence initial={false}>
                            {pendientes.map((item) => (
                                <SwipeableRow 
                                    key={item.id} 
                                    item={item} 
                                    onAction={(estado) => handleAction(item.id, estado)} 
                                />
                            ))}
                        </AnimatePresence>

                        {pendientes.length === 0 && !loading && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="empty-review flex flex-col items-center justify-center p-12 text-center"
                            >
                                <div className="text-6xl mb-4">🏆</div>
                                <h2 className="text-xl font-bold text-slate-800">¡Todo al día!</h2>
                                <p className="text-slate-500 mb-8">Has terminado la revisión de asistencia para esta sesión.</p>
                                
                                <button 
                                    className="btn btn-primary btn-lg btn-block shadow-lg"
                                    onClick={handleFinalize}
                                    disabled={saving}
                                >
                                    {saving ? 'Guardando...' : 'Confirmar y Finalizar'}
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {pendientes.length > 0 && (
                        <div className="swipe-hint-container">
                            <div className="swipe-hint hint-absent">
                                <span>←</span> Ausente
                            </div>
                            <div className="swipe-hint text-slate-400">
                                Swipe para marcar
                            </div>
                            <div className="swipe-hint hint-present">
                                Presente <span>→</span>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AnimatedPage>
    );
}

function SwipeableRow({ item, onAction }: { item: Matricula & { estudiante: Estudiante }, onAction: (estado: 'presente' | 'ausente' | 'tarde') => void }) {
    const x = useMotionValue(0);
    // Controlar qué acción mostrar según la dirección
    const presentOpacity = useTransform(x, [50, 150], [0, 1]);
    const absentOpacity = useTransform(x, [-50, -150], [0, 1]);
    
    const handleDragEnd = (_: any, info: any) => {
        const threshold = 120;
        if (info.offset.x > threshold) {
            onAction('presente');
        } else if (info.offset.x < -threshold) {
             onAction('ausente');
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="swipe-row-container"
        >
            {/* Fondo Verde (Presente) */}
            <motion.div className="swipe-action-present" style={{ opacity: presentOpacity }}>
                <span>✅ PRESENTE</span>
            </motion.div>

            {/* Fondo Rojo (Ausente) */}
            <motion.div className="swipe-action-absent" style={{ opacity: absentOpacity }}>
                <span>❌ AUSENTE</span>
            </motion.div>

            {/* Tarjeta Superior (Interactivo) */}
            <motion.div
                style={{ x }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                onClick={() => onAction('tarde')}
                className="slim-card"
            >
                <div className="slim-card-info">
                    <h3>{item.estudiante.nombre_completo}</h3>
                    <p>{item.estudiante.carnet}</p>
                </div>
                <div className="text-slate-300">
                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Tap para Tarde</span>
                    <span className="ml-2">⋮⋮</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
