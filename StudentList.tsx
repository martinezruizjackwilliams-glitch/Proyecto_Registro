import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import '../styles/components.css';

import { Matricula, Estudiante } from '../types';
import { useBranding } from '../contexts/BrandingContext';

interface StudentListProps {
    matriculas: (Matricula & { estudiante: Estudiante })[];
    loading: boolean;
    onEdit: (estudiante: Estudiante) => void;
    onDelete: (matriculaId: string) => Promise<void>;
}

export const StudentList: React.FC<StudentListProps> = ({ matriculas, loading, onEdit, onDelete }) => {
    const [qrVisible, setQrVisible] = useState<string | null>(null);
    const { orgName } = useBranding();

    if (loading && matriculas.length === 0) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
            </div>
        );
    }

    if (matriculas.length === 0) {
        return (
            <div className="empty-state">
                <p>No hay estudiantes en esta clase</p>
            </div>
        );
    }

    return (
        <div className="student-list-container">
            <h2 className="section-title">Estudiantes Matriculados ({matriculas.length})</h2>

            <div className="students-grid">
                {matriculas.map((m) => (
                    <div key={m.id} className="list-item">
                        <div className={`list-item-avatar ${!m.estudiante.sexo ? '' : m.estudiante.sexo === 'M' ? 'avatar-blue' : 'avatar-pink'}`}>
                            {m.estudiante.sexo === 'M' ? '♂' : m.estudiante.sexo === 'F' ? '♀' : '👤'}
                        </div>
                        <div className="list-item-content">
                            <div className="list-item-name">{m.estudiante.nombre_completo}</div>
                            <div className="list-item-detail">{m.estudiante.carnet} • {m.estudiante.carrera}</div>
                        </div>
                        <div className="list-item-action flex gap-sm">
                            <button
                                className="back-button icon-button-sm"
                                onClick={() => onEdit(m.estudiante)}
                                title="Editar Estudiante"
                            >
                                ✏️
                            </button>
                            <button
                                className={`back-button icon-button-sm ${qrVisible === m.estudiante.id ? 'qr-btn-active' : 'qr-btn-inactive'}`}
                                onClick={() => setQrVisible(qrVisible === m.estudiante.id ? null : m.estudiante.id)}
                                title="Ver QR"
                            >
                                {qrVisible === m.estudiante.id ? '✕' : '🔍'}
                            </button>
                            <button
                                className="back-button icon-button-sm btn-delete-light"
                                onClick={() => onDelete(m.id)}
                                title="Eliminar"
                            >
                                🗑️
                            </button>
                        </div>

                        {/* ── QR POPUP RENDERING ── */}
                        {qrVisible === m.estudiante.id && (
                            <div className="qr-popup">
                                <button className="qr-close-btn" onClick={() => setQrVisible(null)}>✕</button>
                                
                                <div className="qr-header">
                                    <p className="qr-univ-name">{orgName || 'SENTINEL'}</p>
                                    <p className="qr-dept-name">Asistencia</p>
                                </div>

                                <div className="qr-code-container">
                                    <QRCode value={m.estudiante.carnet} size={150} level="H" />
                                </div>

                                <div className="qr-student-info">
                                    <p className="qr-student-name">{m.estudiante.nombre_completo}</p>
                                    <p className="qr-student-carnet">{m.estudiante.carnet}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
