import { motion } from 'framer-motion';
import { Icon } from './Icon';
import type { GrupoClase } from '../types';

interface ClassCardProps {
    grupo: GrupoClase;
    isToday: boolean;
    isCompleted: boolean;
    onClick: () => void;
}

export function ClassCard({ grupo, isToday, isCompleted, onClick }: ClassCardProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden cursor-pointer"
            onClick={onClick}
            style={{
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-lg)',
                boxShadow: isToday ? 'var(--shadow-premium)' : 'var(--shadow-soft)',
                transition: 'all 0.2s ease',
            }}
        >
            {/* Status Indicator Lateral */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: isCompleted 
                    ? 'var(--color-success)' 
                    : isToday 
                        ? 'var(--color-brand-primary)' 
                        : 'var(--color-border)',
                borderRadius: '4px 0 0 4px',
            }} />
            
            <div style={{ marginLeft: '8px' }}>
                {/* Header with status badge */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--space-sm)',
                }}>
                    <div>
                        <h3 style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--font-weight-bold)',
                            color: 'var(--color-text)',
                            marginBottom: '4px',
                            letterSpacing: 'var(--tracking-tight)',
                        }}>
                            {grupo.nombre_asignatura}
                        </h3>
                        <p style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 'var(--font-weight-medium)',
                            textTransform: 'uppercase' as any,
                            letterSpacing: 'var(--tracking-wider)',
                        }}>
                            {grupo.codigo_grupo} • Aula {grupo.aula}
                        </p>
                    </div>
                    
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        textTransform: 'uppercase' as any,
                        letterSpacing: 'var(--tracking-wider)',
                        background: isCompleted 
                            ? 'rgba(46,125,50,0.1)' 
                            : isToday 
                                ? 'rgba(251,192,45,0.15)' 
                                : 'var(--color-surface-soft)',
                        color: isCompleted 
                            ? 'var(--color-success)' 
                            : isToday 
                                ? '#E65100' 
                                : 'var(--color-text-secondary)',
                    }}>
                        {isCompleted ? '✓ Completada' : isToday ? '● Hoy' : '○ No hoy'}
                    </span>
                </div>
            
                {/* Meta info */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-md)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-hint)',
                    fontWeight: 'var(--font-weight-medium)',
                }}>
                    <span>🕐 {grupo.horario}</span>
                    {grupo.hora_inicio && (
                        <span>
                            {grupo.hora_inicio.substring(0, 5)} - {grupo.hora_fin?.substring(0, 5)}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
