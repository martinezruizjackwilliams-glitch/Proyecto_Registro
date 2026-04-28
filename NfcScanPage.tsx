import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getGruposDocente, getMatriculasGrupo } from '../services/attendance';
import type { GrupoClase, Matricula, Estudiante } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';
import { useAppPermissions } from '../hooks/useAppPermissions';
import { LocalStorage } from '../utils/localStorage';

// Variable global para evitar problemas con tipos de NFC si no están instalados los tipos de Cordova
declare const nfc: any;
declare const ndef: any;

export default function NfcScanPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [grupo, setGrupo] = useState<GrupoClase | null>(null);
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScannedName, setLastScannedName] = useState<string | null>(null);
    const { requestAllPermissions } = useAppPermissions();
    const processedSessionIds = useRef<Set<string>>(new Set());

    const playBeep = (success: boolean) => {
        try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = success ? 800 : 300;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + (success ? 0.15 : 0.4));
        } catch (e) {
            console.warn('Audio feedback failed', e);
        }
    };

    const triggerVibration = (type: 'short' | 'long') => {
        if (type === 'short') {
            Haptics.impact({ style: ImpactStyle.Heavy });
        } else {
            Haptics.vibrate();
        }
    };

    useEffect(() => {
        let mounted = true;
        
        const initEffect = async () => {
            if (!mounted) return;
            
            const { camOk, nfcState } = await requestAllPermissions();
            if (nfcState === 'disabled' && mounted) {
                alert('El NFC está desactivado. Por favor, actívalo en los ajustes de tu teléfono.');
            } else if (nfcState === 'unavailable' && mounted) {
                alert('Tu dispositivo no soporta NFC.');
            }
            
            if (!mounted) return;
            loadData();
        };
        
        initEffect();
        
        return () => {
            mounted = false;
            stopNfcScan();
        };
    }, [grupoId]);

    const initSession = async () => {
        const { camOk, nfcState } = await requestAllPermissions();
        if (nfcState === 'disabled') {
            alert('El NFC está desactivado. Por favor, actívalo en los ajustes de tu teléfono.');
        } else if (nfcState === 'unavailable') {
            console.warn('NFC not available on this device');
        }
        loadData();
    };

    const loadData = async () => {
        if (!grupoId) return;
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(g => g.id === grupoId);
            setGrupo(g || null);
            const mats = await getMatriculasGrupo(grupoId);
            setMatriculas(mats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            startNfcScan();
        }
    };

    const startNfcScan = () => {
        if (typeof nfc === 'undefined') {
            return;
        }

        setIsScanning(true);
        nfc.addNdefListener(
            onNfcEvent,
            () => {}, // Silent success
            (err: any) => {} // Silent error
        );
    };

    const stopNfcScan = () => {
        if (typeof nfc !== 'undefined') {
            nfc.removeNdefListener(onNfcEvent);
        }
        setIsScanning(false);
    };

    const onNfcEvent = async (event: any) => {
        // Haptics de detección inicial
        const tagId = nfc.bytesToHexString(event.tag.id);
        console.log('NFC Tag detected:', tagId);

        let carnetDetectado = "";
        try {
            const record = event.tag.ndefMessage[0];
            carnetDetectado = nfc.decodePayload(record.payload).trim().toUpperCase();
        } catch (e) {
            carnetDetectado = tagId.toUpperCase(); // fallback
        }

        // 1. VALIDACIÓN DE DUPLICADOS EN LA SESIÓN ACTUAL
        if (processedSessionIds.current.has(carnetDetectado)) {
            console.warn('Tag already scanned in this session:', carnetDetectado);
            triggerVibration('long');
            playBeep(false);
            return;
        }

        // 2. BÚSQUEDA LOCAL INSTANTÁNEA
        const matricula = matriculas.find(m => m.estudiante.carnet.toUpperCase() === carnetDetectado);
        
        if (matricula) {
            // Feedback positivo inmediato
            triggerVibration('short');
            playBeep(true);

            // Marcar como procesado en la sesión para evitar rebotes
            processedSessionIds.current.add(carnetDetectado);

            // 3. GUARDAR EN COLA LOCAL (Offline Vault)
            const fechaClase = new Date().toISOString().split('T')[0];
            await LocalStorage.addToQueue({
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
                type: 'ADD_ATTENDANCE',
                payload: { 
                    id_estudiante: matricula.estudiante.id, 
                    id_grupo: grupoId, 
                    fecha_clase: fechaClase,
                    estado: 'presente',
                    id_matricula: matricula.id
                }
            });

            setScannedIds(prev => {
                const newSet = new Set(prev);
                newSet.add(matricula.id);
                return newSet;
            });
            setLastScannedName(matricula.estudiante.nombre_completo);
            setTimeout(() => setLastScannedName(null), 2500);
        } else {
            // Estudiante no encontrado en este grupo
            console.warn('Estudiante no matriculado:', carnetDetectado);
            triggerVibration('long');
            playBeep(false);
            setLastScannedName(`NO MATRICULADO: ${carnetDetectado}`);
            setTimeout(() => setLastScannedName(null), 3000);
        }
    };

    const handleFinish = () => {
        stopNfcScan();
        // Navegar a la página de revisión con los IDs escaneados
        navigate(`/attendance-review/${grupoId}`, { 
            state: { scannedMatriculaIds: Array.from(scannedIds) } 
        });
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
    if (!grupo) return <div className="empty-state"><h3>Clase no encontrada</h3></div>;

    return (
        <AnimatedPage>
            <div className="app-layout">
                <header className="app-header">
                    <div className="header-row">
                        <button className="back-button" onClick={() => navigate(-1)}>←</button>
                        <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                            <h1>NFC: {grupo.nombre_asignatura}</h1>
                            <p className="subtitle">Acerca los carnets al dispositivo</p>
                        </div>
                    </div>
                </header>

                <main className="page flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
                    <div className={`nfc-aura ${isScanning ? 'scanning' : ''}`} style={{
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'rgba(21, 101, 192, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '5rem',
                        marginBottom: 'var(--space-xl)',
                        position: 'relative'
                    }}>
                        📡
                        {isScanning && <div className="pulse-ring" />}
                    </div>

                    <div className="text-center">
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                            {scannedIds.size}
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 600 }}>
                            Estudiantes Detectados
                        </p>
                    </div>

                    {lastScannedName && (
                        <div style={{
                            marginTop: 'var(--space-lg)',
                            background: 'var(--color-success)',
                            color: 'white',
                            padding: 'var(--space-md) var(--space-xl)',
                            borderRadius: '2rem',
                            fontWeight: 600,
                            animation: 'slideUp 0.3s ease-out'
                        }}>
                            ✅ {lastScannedName}
                        </div>
                    )}

                    {!isScanning && (
                        <p style={{ color: 'var(--color-error)', marginTop: 'var(--space-md)' }}>
                            El sensor NFC no está disponible o activo.
                        </p>
                    )}

                    <div style={{ position: 'fixed', bottom: 'var(--space-xl)', left: 'var(--space-lg)', right: 'var(--space-lg)' }}>
                        <button 
                            className="btn btn-primary btn-block btn-lg shadow-xl"
                            onClick={handleFinish}
                            style={{ height: '4rem', fontSize: '1.1rem' }}
                        >
                            Finalizar y Revisar →
                        </button>
                    </div>
                </main>
            </div>

            <style>{`
                .nfc-aura.scanning .pulse-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 4px solid var(--color-primary);
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </AnimatedPage>
    );
}
