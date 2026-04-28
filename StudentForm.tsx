import React, { useState } from 'react';
import type { Estudiante } from '../types';
import '../styles/components.css';

interface StudentFormProps {
    onAddManual: (data: {
        nombre: string;
        carnet: string;
        carrera: string;
        carreraId?: string;
        sexo: 'M' | 'F';
        telefono: string;
    }) => Promise<void>;
    onAddList: (data: {
        listText: string;
        defaultCarrera: string;
        defaultCarreraId?: string;
    }) => Promise<void>;
    loading: boolean;
    editingStudent?: Estudiante | null;
    onCancelEdit?: () => void;
    onUpdateStudent?: (id: string, data: any) => Promise<void>;
    carreras: { id: string | number; nombre: string }[];
    defaultCarreraName?: string;
    defaultCarreraId?: string;
    /** Nombre dinámico inyectado desde nomenclatura.carrera (ej: "Programa", "Curso") */
    carreraLabel?: string;
}

export const StudentForm: React.FC<StudentFormProps> = ({ 
    onAddManual, 
    onAddList, 
    loading,
    editingStudent,
    onCancelEdit,
    onUpdateStudent,
    carreras,
    defaultCarreraName,
    defaultCarreraId,
    carreraLabel = 'Carrera',
}) => {
    const [mode, setMode] = useState<'manual' | 'list'>('manual');

    // Efecto para cargar datos en caso de edición
    React.useEffect(() => {
        if (editingStudent) {
            setNombre(editingStudent.nombre_completo);
            setCarnet(editingStudent.carnet);
            setCarrera(editingStudent.carrera || '');
            setCarreraId(editingStudent.id_carrera || '');
            setSexo(editingStudent.sexo || 'M');
            setTelefono(editingStudent.telefono || '');
            setMode('manual');
        } else if (defaultCarreraName) {
            if (!carrera) setCarrera(defaultCarreraName);
            if (!defaultCarrera) setDefaultCarrera(defaultCarreraName);
        }
    }, [editingStudent, defaultCarreraName]);

    // Manual form state
    const [nombre, setNombre] = useState('');
    const [carnet, setCarnet] = useState('');
    const [carrera, setCarrera] = useState('');
    const [carreraId, setCarreraId] = useState<string>('');
    const [sexo, setSexo] = useState<'M' | 'F'>('M');
    const [telefono, setTelefono] = useState('');

    // List state
    const [listText, setListText] = useState('');
    const [defaultCarrera, setDefaultCarrera] = useState('');
    const [listCarreraId, setListCarreraId] = useState('');

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStudent && onUpdateStudent) {
            await onUpdateStudent(editingStudent.id, { nombre, carnet, carrera, sexo, telefono });
        } else {
            await onAddManual({ nombre, carnet, carrera, sexo, telefono, carreraId });
            setNombre('');
            setCarnet('');
            setCarrera('');
            setCarreraId('');
            setSexo('M');
            setTelefono('');
        }
    };

    const handleListSubmit = async () => {
        await onAddList({ listText, defaultCarrera, defaultCarreraId: listCarreraId });
        setListText('');
    };

    return (
        <div className="student-form-container">
            {/* Mode Toggle */}
            <div className="mode-toggle">
                {!editingStudent ? (
                    <>
                        <button
                            className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('manual')}
                        >
                            ✍️ Manual
                        </button>
                        <button
                            className={`btn btn-sm ${mode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMode('list')}
                        >
                            📋 Pegar Lista
                        </button>
                    </>
                ) : (
                    <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-primary">✏️ Editando Estudiante</span>
                        <button className="btn btn-sm btn-secondary" onClick={onCancelEdit}>
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {/* ── MANUAL ENTRY ── */}
            {mode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="card mb-lg">
                    <div className="form-group">
                        <label className="form-label" htmlFor="est-nombre">Nombre Completo</label>
                        <input
                            id="est-nombre"
                            className="form-input"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Juan Antonio Pérez"
                            required
                        />
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor="est-carnet">Carnet</label>
                            <input
                                id="est-carnet"
                                className="form-input"
                                value={carnet}
                                onChange={(e) => setCarnet(e.target.value)}
                                placeholder="2026-0012A"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="est-sexo">Sexo</label>
                            <select
                                id="est-sexo"
                                className="form-input"
                                value={sexo}
                                onChange={(e) => setSexo(e.target.value as 'M' | 'F')}
                            >
                                <option value="M">♂ Masculino</option>
                                <option value="F">♀ Femenino</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor="est-carrera">{carreraLabel}</label>
                            <select
                                id="est-carrera"
                                className="form-input"
                                value={carreraId}
                                onChange={(e) => {
                                    const selected = carreras.find(c => String(c.id) === e.target.value);
                                    setCarreraId(e.target.value);
                                    setCarrera(selected?.nombre || '');
                                }}
                                required
                            >
                                <option value="">Seleccione {carreraLabel.toLowerCase()}</option>
                                {carreras.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="est-telefono">Teléfono (WhatsApp)</label>
                            <input
                                id="est-telefono"
                                className="form-input"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="88888888"
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? (
                            <><div className="spinner button-spinner" /> Procesando...</>
                        ) : (
                            editingStudent ? '💾 Guardar Cambios' : '➕ Agregar Estudiante'
                        )}
                    </button>
                </form>
            )}

            {/* ── LIST ENTRY ── */}
            {mode === 'list' && (
                <div className="card mb-lg">
                    <p className="list-format-hint">
                        📌 Pegue los datos desde Excel usando este orden de columnas:<br />
                        <strong>Nombre | Carnet/ID | Sexo | {carreraLabel} | Teléfono</strong>
                    </p>
                    <div className="form-group">
                        <label className="form-label" htmlFor="list-input">Lista de Estudiantes</label>
                        <textarea
                            id="list-input"
                            className="form-input textarea-list"
                            value={listText}
                            onChange={(e) => setListText(e.target.value)}
                            placeholder={`Pega desde Excel...\nJuan Pérez\t2026-0012A\tM\tMed. Veterinaria\t88888888\nMaría López\t2026-0013B\tF\tAgronomía\t77777777`}
                            rows={8}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="default-carrera">
                            {carreraLabel} por defecto <span className="default-carrera-hint">(si no se especifica)</span>
                        </label>
                        <select
                            id="default-carrera"
                            className="form-input"
                            value={listCarreraId}
                            onChange={(e) => {
                                const selected = carreras.find(c => String(c.id) === e.target.value);
                                setListCarreraId(e.target.value);
                                setDefaultCarrera(selected?.nombre || '');
                            }}
                        >
                            <option value="">Seleccione {carreraLabel.toLowerCase()}</option>
                            {carreras.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleListSubmit}
                        disabled={loading || !listText.trim()}
                    >
                        {loading ? (
                            <><div className="spinner button-spinner" /> Procesando...</>
                        ) : (
                            '📋 Procesar Lista'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
