import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getMatriculasGrupo, 
    findOrCreateEstudiante, 
    safeCreateMatricula, 
    deleteMatricula,
    updateEstudiante,
    getGruposDocente
} from '../services/attendance';
import type { Matricula, Estudiante } from '../types';
import { handleShareQR } from '../utils/shareUtils';
import { StudentForm } from '../components/StudentForm';
import { StudentList } from '../components/StudentList';
import { SyncBanner } from '../components/SyncBanner';
import { supabase } from '../services/supabase';
import type { Carrera } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import { LocalStorage } from '../utils/localStorage';

export default function AddStudentsPage() {
    const { id: grupoId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { nomenclatura } = useBranding();
    const [grupoName, setGrupoName] = useState<string>('');
    
    const [matriculas, setMatriculas] = useState<(Matricula & { estudiante: Estudiante })[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasPending, setHasPending] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [carreras, setCarreras] = useState<Carrera[]>([]);
    const [grupoIdCarrera, setGrupoIdCarrera] = useState<string | number>('');
    const [defaultCarreraName, setDefaultCarreraName] = useState<string>('');
    const [defaultCarreraId, setDefaultCarreraId] = useState<string>('');

    useEffect(() => {
        const fetchCatalogos = async () => {
            const { data } = await supabase.from('carreras').select('id, nombre').order('nombre');
            if (data) setCarreras(data);
        };
        fetchCatalogos();
    }, []);

    useEffect(() => {
        if (grupoId) {
            loadMatriculas();
            loadGrupo();
            checkPending();
        }
    }, [grupoId]);

    useEffect(() => {
        if (carreras.length > 0 && grupoIdCarrera) {
            const match = carreras.find(c => String(c.id) === String(grupoIdCarrera));
            if (match) {
                setDefaultCarreraName(match.nombre);
                setDefaultCarreraId(String(match.id));
            }
        }
    }, [carreras, grupoIdCarrera]);

    // Ahora async: lee de Capacitor Preferences (mismo vault que syncService)
    const checkPending = async () => {
        const queue = await LocalStorage.getQueue();
        setHasPending(queue.length > 0);
    };

    const handleSyncManual = async () => {
        setSyncing(true);
        try {
            const { sincronizarPendientes } = await import('../services/syncService');
            const count = await sincronizarPendientes();
            if (count > 0) {
                setSuccess(`✅ Se sincronizaron ${count} registros pendientes.`);
                await loadMatriculas();
            }
            checkPending();
        } catch (err) {
            console.error('Manual sync failed', err);
            setError('Error al sincronizar. Revisa tu conexión.');
        } finally {
            setSyncing(false);
        }
    };

    const loadGrupo = async () => {
        if (!grupoId) return;
        try {
            const grupos = await getGruposDocente();
            const g = grupos.find(x => x.id === grupoId);
            if (g) {
                setGrupoName(g.nombre_asignatura);
                setGrupoIdCarrera(g.id_carrera);
            }
        } catch (err) {
            console.error('Error loading class name', err);
        }
    };

    const loadMatriculas = async () => {
        if (!grupoId) return;
        setLoading(true);
        try {
            const data = await getMatriculasGrupo(grupoId);
            setMatriculas(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddManual = async (data: { nombre: string; carnet: string; carrera: string; carreraId?: string; sexo: 'M' | 'F'; telefono: string }) => {
        const { nombre, carnet, carrera, carreraId, sexo, telefono } = data;
        setError('');
        setSuccess('');
        setProcessing(true);

        let formattedTelefono = telefono.trim();
        if (formattedTelefono.length === 8) {
            formattedTelefono = '505' + formattedTelefono;
        }

        try {
            const est = await findOrCreateEstudiante({
                carnet: carnet.trim().toUpperCase(),
                nombre_completo: nombre.trim(),
                carrera: carrera.trim(),
                id_carrera: carreraId,
                sexo,
                telefono: formattedTelefono || undefined,
            });

            if (!grupoId) throw new Error("ID de grupo no encontrado");
            const { wasAlreadyEnrolled } = await safeCreateMatricula(grupoId, est.id);

            if (wasAlreadyEnrolled) {
                setSuccess(`${est.nombre_completo} ya estaba matriculado/a en esta clase.`);
            } else {
                setSuccess(`${est.nombre_completo} matriculado/a correctamente.`);
            }

            await loadMatriculas();
            checkPending();
        } catch (err: any) {
            if (err.message === 'Failed to fetch' || !navigator.onLine) {
                // Usa LocalStorage (Capacitor Preferences) — mismo vault que syncService
                await LocalStorage.addToQueue({
                    id: crypto.randomUUID(),
                    type: 'ADD_STUDENT_MANUAL',
                    payload: { grupoId, carnet: carnet.trim().toUpperCase(), nombre_completo: nombre.trim(), carrera: carrera.trim(), id_carrera: carreraId, sexo, telefono: formattedTelefono },
                });
                setSuccess('Sin conexión: La acción ha sido guardada localmente de forma segura.');
                await checkPending();
            } else {
                setError(err instanceof Error ? err.message : 'Error al agregar estudiante');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateStudent = async (id: string, updatedData: any) => {
        setProcessing(true);
        try {
            const updated = await updateEstudiante(id, {
                nombre_completo: updatedData.nombre,
                carnet: updatedData.carnet,
                carrera: updatedData.carrera,
                sexo: updatedData.sexo,
                telefono: updatedData.telefono
            });

            // Update local state without full reload
            setMatriculas(prev => prev.map(m => 
                m.estudiante.id === id ? { ...m, estudiante: updated } : m
            ));
            
            setEditingStudent(null);
            setSuccess(`✅ ${updated.nombre_completo} actualizado correctamente.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar estudiante');
        } finally {
            setProcessing(false);
        }
    };

    const handleAddList = async (data: { listText: string; defaultCarrera: string; defaultCarreraId?: string }) => {
        const { listText, defaultCarrera, defaultCarreraId } = data;
        setError('');
        setSuccess('');
        setProcessing(true);

        const lines = listText
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0);

        // Smart Parser: detectar separadores flexibles (Tab, Coma, Punto y coma, Dos puntos)
        const smartSplit = (line: string): string[] => {
            // Regex: acepta \t, ,, ; o : como separadores
            const parts = line.split(/[\t,;:]/)
                .map(p => p.trim())
                .filter(p => p.length > 0);
            return parts;
        };

        // Header Skip: filtrar filas que parecen encabezados de Excel
        const headerKeywords = ['nombre', 'carnet', 'id', 'identificacion', 'sexo', 'carrera', 'telefono', 'programa', 'curso'];
        const isHeader = (parts: string[]): boolean => {
            if (parts.length === 0) return false;
            const firstCell = parts[0].toLowerCase();
            return headerKeywords.some(kw => firstCell.includes(kw));
        };

        // Limpiar líneas y filtrar encabezados
        let cleanedLines = lines
            .map(line => smartSplit(line))
            .filter(parts => parts.length >= 2 && !isHeader(parts));

        let added = 0;
        let alreadyEnrolled = 0;
        let skippedBadFormat = 0;
        const lineErrors: string[] = [];
        const offlineQueue: any[] = [];

        const batchSize = 10;
        
        for (let i = 0; i < cleanedLines.length; i += batchSize) {
            const batch = cleanedLines.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (parts) => {
                const nombre = parts[0]?.trim();
                const carnet = parts[1]?.trim();
                const rawSexo = parts[2]?.trim();
                const carreraVal = parts[3]?.trim();
                const celular = parts[4]?.trim();

                if (!nombre || !carnet) {
                    skippedBadFormat++;
                    lineErrors.push(`"${nombre || parts[0]?.substring(0, 20)}...": Falta nombre o carnet`);
                    return;
                }

                if (!/^[A-Z0-9\-_]+$/i.test(carnet)) {
                    skippedBadFormat++;
                    lineErrors.push(`"${nombre}": Formato de carnet inválido`);
                    return;
                }

                try {
                    const sexoVal: 'M' | 'F' | undefined = 
                        rawSexo?.toUpperCase() === 'M' ? 'M' : 
                        rawSexo?.toUpperCase() === 'F' ? 'F' : undefined;

                    let listTelefono = celular || '';
                    if (listTelefono.length === 8) {
                        listTelefono = '505' + listTelefono;
                    }

                    const finalCarrera = carreraVal || defaultCarrera || 'Sin especificar';

                    if (!navigator.onLine) {
                        offlineQueue.push({
                            id: crypto.randomUUID(), 
                            type: 'ADD_STUDENT_LIST', 
                            payload: { grupoId, nombre_completo: nombre, carnet: carnet.toUpperCase(), rawSexo, carrera: finalCarrera, celular: listTelefono, defaultCarrera },
                            timestamp: Date.now() 
                        });
                        return;
                    }

                    const est = await findOrCreateEstudiante({
                        nombre_completo: nombre,
                        carnet: carnet.toUpperCase(),
                        sexo: sexoVal,
                        carrera: finalCarrera,
                        id_carrera: defaultCarreraId,
                        telefono: listTelefono || undefined,
                    });

                    if (!grupoId) throw new Error("ID de grupo no encontrado");
                    const { wasAlreadyEnrolled } = await safeCreateMatricula(grupoId, est.id);

                    if (wasAlreadyEnrolled) {
                        alreadyEnrolled++;
                    } else {
                        added++;
                    }
                } catch (err: any) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`Error adding ${nombre}:`, msg);
                    lineErrors.push(`"${nombre}": ${msg}`);
                }
            }));
        }

        if (offlineQueue.length > 0) {
            for (const action of offlineQueue) {
                await LocalStorage.addToQueue({
                    id: action.id,
                    type: action.type as 'ADD_STUDENT_LIST',
                    payload: action.payload,
                });
            }
            setSuccess(`${offlineQueue.length} estudiantes guardados localmente para sincronizar cuando haya conexión.`);
            await checkPending();
        }

        const resultParts: string[] = [];
        if (added > 0) resultParts.push(`${added} matriculado(s)`);
        if (alreadyEnrolled > 0) resultParts.push(`${alreadyEnrolled} ya estaban matriculado(s)`);
        if (skippedBadFormat > 0) resultParts.push(`${skippedBadFormat} ignorado(s) por formato inválido`);
        if (lineErrors.length > 0) resultParts.push(`${lineErrors.length} error(es)`);

        console.log('Batch result:', resultParts.join(' · '), 'errors:', lineErrors);

        if (lineErrors.length > 0) {
            console.error('Line errors:', lineErrors);
            setError(`${lineErrors.length} error(es): ${lineErrors.slice(0, 2).join(', ')}${lineErrors.length > 2 ? '...' : ''}`);
        }

        setSuccess(resultParts.join(' · ') || 'Sin cambios');
        await loadMatriculas();
        setProcessing(false);
    };

    const handleDeleteMatricula = async (matriculaId: string) => {
        try {
            await deleteMatricula(matriculaId);
            await loadMatriculas();
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = async (estudiante: Estudiante) => {
        try {
            await handleShareQR(estudiante);
        } catch (err) {
            console.error('Error sharing QR:', err);
            alert('No se pudo compartir la credencial.');
        }
    };

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-row">
                    <button className="back-button" onClick={() => navigate(-1)} aria-label="Volver">←</button>
                    <div style={{ flex: 1, marginLeft: 'var(--space-md)' }}>
                        <h1>Estudiantes</h1>
                        <p className="subtitle">{grupoName}</p>
                    </div>
                    <span className="header-badge">
                        {matriculas.length}
                    </span>
                </div>
            </header>

            <main className="page">
                <SyncBanner 
                    hasPending={hasPending} 
                    syncing={syncing} 
                    onSync={handleSyncManual} 
                />

                <div className="stats-card mb-md">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <p className="stats-label">Estudiantes Matriculados</p>
                            <h2 className="stats-value">{matriculas.length}</h2>
                        </div>
                        <div className="icon-circle btn-primary-light">
                            🎓
                        </div>
                    </div>
                </div>

                <StudentForm 
                    onAddManual={handleAddManual} 
                    onAddList={handleAddList} 
                    loading={processing}
                    editingStudent={editingStudent}
                    onCancelEdit={() => setEditingStudent(null)}
                    onUpdateStudent={handleUpdateStudent}
                    carreras={carreras}
                    defaultCarreraName={defaultCarreraName}
                    defaultCarreraId={defaultCarreraId}
                    carreraLabel={nomenclatura.carrera}
                />

                {/* Messages */}
                {error && (
                    <div className="form-message form-message-error">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="form-message form-message-success">
                        {success}
                    </div>
                )}

                <StudentList 
                    matriculas={matriculas} 
                    loading={loading} 
                    onEdit={(est) => {
                        setEditingStudent(est);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    onDelete={handleDeleteMatricula} 
                />
            </main>
        </div>
    );
}
