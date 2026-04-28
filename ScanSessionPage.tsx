import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { getGruposDocente, registrarAsistencia, getAsistenciaGrupoFecha, getMatriculasGrupo, getLocalISODate } from '../services/attendance';
import { supabase } from '../services/supabase';
import { LocalStorage } from '../utils/localStorage';
import { AnimatedPage } from '../components/AnimatedPage';
import { useAppPermissions } from '../hooks/useAppPermissions';
import { Icon } from '../components/Icon';
import type { ScanResult, GrupoClase, RegistroAsistencia, Estudiante, Matricula } from '../types';

export default function ScanSessionPage() {
    const { checkAndRequestCamera } = useAppPermissions();
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [grupo, setGrupo] = useState<GrupoClase | null>(null);
    const [scanning, setScanning] = useState(false);
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
    const [records, setRecords] = useState<(RegistroAsistencia & { estudiante?: Estudiante })[]>([]);
    const [flashColor, setFlashColor] = useState<string | null>(null);
    const [scanCount, setScanCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [flashEnabled, setFlashEnabled] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const processingRef = useRef(false);
    const sessionStartRef = useRef<Date>(new Date());
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Optimización O(1): Mapa para búsqueda instantánea de carnet
    const carnetToMatricula = useMemo(() => {
        const map = new Map<string, Matricula & { estudiante: Estudiante }>();
        matriculas.forEach(m => {
            map.set(m.estudiante.carnet.toUpperCase(), m);
        });
        return map;
    }, [matriculas]);

    // Selector de fecha para asistencia retroactiva
    const todayStr = getLocalISODate();
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const isHistoricalMode = selectedDate !== todayStr;
    const fechaClase = selectedDate;

    // Parse the class start time
    const getClassStartTime = useCallback((): Date => {
        const now = new Date();
        if (grupo?.hora_inicio) {
            const parts = grupo.hora_inicio.split(':');
            now.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
        } else {
            // Use session start as fallback
            return sessionStartRef.current;
        }
        return now;
    }, [grupo?.hora_inicio]);

    // Load group and existing attendance for today
    useEffect(() => {
        initSession();
    }, [grupoId, selectedDate]);

    const initSession = async () => {
        const ok = await checkAndRequestCamera();
        if (!ok) {
            alert('Se requiere permiso de cámara para escanear códigos QR.');
        }
        loadExisting();
    };

    const loadExisting = async () => {
        if (!grupoId) return;
        setLoading(true);
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(x => x.id === grupoId);
            if (g) setGrupo(g);

            // Cargar TODAS las matrículas para búsqueda local instantánea
            const mats = await getMatriculasGrupo(grupoId);
            setMatriculas(mats);

            const existing = await getAsistenciaGrupoFecha(grupoId, fechaClase);
            const existingIds = new Set(existing.map(r => r.id_estudiante));
            setScannedIds(existingIds);
            setRecords(existing);
            setScanCount(existing.length);
        } catch (err) {
            console.error('Error loading session data:', err);
        } finally {
            setLoading(false);
        }
    };

    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode('qr-reader', {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                ],
                verbose: false,
            });
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 15,
                    qrbox: { width: 280, height: 180 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                } as any,
                (decodedText) => handleScan(decodedText),
                () => { }
            );

            if (flashEnabled) {
                applyTorch(true);
            }

            setScanning(true);
        } catch (err) {
            console.error('Error starting scanner:', err);
            alert('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    };

    const applyTorch = async (enabled: boolean) => {
        if (scannerRef.current) {
            try {
                const track = scannerRef.current.getRunningTrackCapabilities
                    ? await scannerRef.current.getRunningTrackCapabilities()
                    : null;
                
                if (track && 'torch' in track) {
                    await scannerRef.current.applyVideoConstraints({
                        advanced: [{ torch: enabled } as any]
                    });
                }
            } catch (err) {
                console.warn('Torch not available:', err);
            }
        }
    };

    const toggleFlash = () => {
        const newState = !flashEnabled;
        setFlashEnabled(newState);
        applyTorch(newState);
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setScanning(false);
    };

    const handleScan = async (qrData: string) => {
        if (processingRef.current) return;
        processingRef.current = true;

        const carnetEscaneado = qrData.trim().toUpperCase();
        if (!carnetEscaneado) {
            processingRef.current = false;
            return;
        }

        // STEP 1: Búsqueda O(1) con Map
        const matricula = carnetToMatricula.get(carnetEscaneado);

        if (!matricula) {
            setLastResult({
                estudiante: { id: '', carnet: carnetEscaneado, nombre_completo: 'No matriculado', carrera: '' },
                estado: 'ausente',
                hora: new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
                error: true,
                message: `El carnet [${carnetEscaneado}] no pertenece a este grupo.`,
            });
            setFlashColor('red');
            triggerVibration('long');
            playBeep(false);
            setTimeout(() => setFlashColor(null), 800);
            setTimeout(() => { processingRef.current = false; }, 800);
            return;
        }

        const estudiante = matricula.estudiante;

        // STEP 2: Evitar duplicados visuales si ya se procesó en esta sesión activa
        if (scannedIds.has(estudiante.id)) {
            setLastResult({
                estudiante,
                estado: 'presente',
                hora: new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
                message: 'Ya registrado previamente'
            });
            setFlashColor('yellow');
            triggerVibration('medium');
            setTimeout(() => setFlashColor(null), 500);
            setTimeout(() => { processingRef.current = false; }, 500);
            return;
        }

        // STEP 3: Lógica de Asistencia (Local First)
        const now = new Date();
        const classStart = getClassStartTime();
        const diffMinutes = (now.getTime() - classStart.getTime()) / (1000 * 60);
        // Usamos la tolerancia del grupo o 15 min por defecto
        const estado = diffMinutes <= (grupo?.tolerancia_min || 15) ? 'presente' : 'tarde';

        try {
            // Guardar localmente inmediatamente (Offline Vault)
            await LocalStorage.addToQueue({
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
                type: 'ADD_ATTENDANCE',
                payload: {
                    id_estudiante: estudiante.id,
                    id_grupo: grupoId,
                    estado: estado,
                    fecha_clase: fechaClase,
                    id_matricula: matricula.id // Para el upsert masivo luego
                }
            });

            // Actualizar estado local para feedback visual inmediato
            setScannedIds(prev => new Set(prev).add(estudiante.id));
            setScanCount(prev => prev + 1);
            
            const newRecord: any = {
                id_estudiante: estudiante.id,
                id_grupo: grupoId,
                estado: estado,
                fecha_clase: fechaClase,
                estudiante: estudiante,
                fecha_hora_escaneo: now.toISOString()
            };
            setRecords(prev => [newRecord, ...prev]);

            setLastResult({
                estudiante,
                estado,
                hora: now.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }),
                message: 'Registrado localmente'
            });

            setFlashColor('green');
            triggerVibration('short');
            playBeep(true);
            setTimeout(() => setFlashColor(null), 500);

        } catch (err) {
            console.error('Error saving attendance locally:', err);
        } finally {
            setTimeout(() => { processingRef.current = false; }, 500);
        }
    };

    const triggerVibration = (type: 'short' | 'medium' | 'long') => {
        if (!navigator.vibrate) return;
        switch (type) {
            case 'short': navigator.vibrate(100); break;
            case 'medium': navigator.vibrate([100, 50, 200]); break;
            case 'long': navigator.vibrate([200, 100, 200, 100, 200]); break;
        }
    };

    const playBeep = useCallback((success: boolean) => {
        try {
            // Reusar el mismo AudioContext (evita fuga de memoria en sesiones largas)
            if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
                audioCtxRef.current = new AudioContext();
            }
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = success ? 800 : 300;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + (success ? 0.15 : 0.4));
        } catch {
            // Audio not supported
        }
    }, []);

    const handleFinish = async () => {
        await stopScanner();
        // Navegar a la página de revisión con los IDs de las MATRICULAS escaneadas y la fecha
        const scannedMatriculaIds = Array.from(scannedIds).map(estId => {
            const m = matriculas.find(x => x.id_estudiante === estId);
            return m?.id;
        }).filter(Boolean);

        navigate(`/attendance-review/${grupoId}`, { 
            state: { scannedMatriculaIds, selectedDate } 
        });
    };

    // Start scanner on mount; close audio context on unmount
    useEffect(() => {
        const timer = setTimeout(() => startScanner(), 500);
        return () => {
            clearTimeout(timer);
            stopScanner();
            // Liberar recursos de audio del sistema
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close();
            }
        };
    }, []);

    return (
        <AnimatedPage className="scanner-page">
            {/* Flash Overlay */}
            {flashColor && (
                <div className={`flash-overlay flash-${flashColor} z-50`} />
            )}

            {/* Scanner Viewport */}
            <div className="scanner-viewport rounded-b-[2.5rem] overflow-hidden relative shadow-xl">
                {/* High Tech HUD Overlay */}
                <div className="scanner-hud-container">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="scanner-viewfinder"
                    >
                        {/* Corner Lasers */}
                        <div className="viewfinder-corner corner-tl" />
                        <div className="viewfinder-corner corner-tr" />
                        <div className="viewfinder-corner corner-bl" />
                        <div className="viewfinder-corner corner-br" />
                        
                        {/* Animated Scan Line */}
                        <motion.div 
                            animate={{ top: ['10%', '90%', '10%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                            className="scan-line"
                        />
                    </motion.div>
                    
                    <div className="scanner-hud-label">
                        Escanéando código QR...
                    </div>
                </div>

                <div id="qr-reader" style={{ width: '100%', height: '100%' }} />

                {!scanning && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 'var(--space-md)',
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 30,
                    }}>
                        <div className="spinner" style={{ borderTopColor: 'white' }} />
                        <p style={{ color: 'white', fontSize: 'var(--font-size-sm)' }}>Iniciando cámara...</p>
                    </div>
                )}

                {/* Scanner Header */}
                <div className="scanner-header z-20">
                    <button className="scanner-control-btn" onClick={() => navigate('/select-class-scan', { replace: true })} aria-label="Volver">
                        <Icon name="arrow-left" size={20} color="#fff" />
                    </button>
                    <h2 className="text-white font-bold">{grupo?.nombre_asignatura || 'Cargando...'}</h2>
                    <div className="scanner-controls">
                        <button
                            className="scanner-control-btn"
                            onClick={toggleFlash}
                            aria-label={flashEnabled ? 'Apagar linterna' : 'Encender linterna'}
                            style={{
                                background: flashEnabled ? 'var(--color-secondary)' : 'rgba(255, 255, 255, 0.2)',
                                color: flashEnabled ? '#1f2937' : 'white',
                            }}
                        >
                            <Icon name="sun" size={20} color={flashEnabled ? '#1f2937' : '#fff'} />
                        </button>
                    </div>
                </div>

                {/* Selector de Fecha (Historical Mode) */}
                <div className="relative z-20" style={{
                    background: isHistoricalMode ? 'rgba(245, 158, 11, 0.95)' : 'rgba(0, 0, 0, 0.4)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    flexDirection: 'column',
                }}>
                    {isHistoricalMode && (
                        <div className="badge-pending px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-2">
                            ⚠️ Modo Histórico Activo
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                            Fecha:
                        </span>
                        <input
                            type="date"
                            value={selectedDate}
                            min={yearStart}
                            max={todayStr}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white/90 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                        />
                    </div>
                </div>

                {/* Scan Counter */}
                <div className="scan-counter z-20 bg-white/10 backdrop-blur-md border border-white/20">
                    <span className="font-bold text-white">{scanCount}</span>
                    <span className="text-white/60 text-[10px] uppercase font-bold ml-1">Escaneados</span>
                </div>

                {/* Finish Button */}
                <button className="scanner-finish-btn z-20 shadow-lg" onClick={handleFinish}>
                    <Icon name="logout" size={18} color="#fff" />
                    Finalizar Sesión
                </button>

                {/* Last Scan Result */}
                <AnimatePresence>
                    {lastResult && (
                        <motion.div
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 200, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="scanner-result-panel z-40"
                        >
                            <div className={`scan-result-card ${lastResult.error ? 'scan-result-error' :
                                lastResult.estado === 'presente' ? 'scan-result-presente' :
                                    'scan-result-tarde'
                                } shadow-elevated`}>
                                <div className="scan-result-icon">
                                    <Icon 
                                        name={lastResult.error ? 'trash' : lastResult.estado === 'presente' ? 'users' : 'clock'} 
                                        size={24} 
                                        color="#fff" 
                                    />
                                </div>
                                <div className="scan-result-info">
                                    <h3 className="font-bold text-slate-900">{lastResult.estudiante.nombre_completo}</h3>
                                    <p className="text-xs font-medium text-slate-500">
                                        {lastResult.error
                                            ? lastResult.message
                                            : `${lastResult.estado === 'presente' ? 'Presente' : 'Llegada Tardía'} (${lastResult.hora})`
                                        }
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AnimatedPage>
    );
}
