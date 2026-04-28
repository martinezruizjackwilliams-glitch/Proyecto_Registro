import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getGruposDocente, getLocalISODate } from '../services/attendance';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { sincronizarPendientes } from '../services/syncService';
import type { GrupoClase } from '../types';
import { AnimatedPage } from '../components/AnimatedPage';
import { AnimatedList, itemVariant } from '../components/AnimatedList';
import { Icon } from '../components/Icon';
import { motion } from 'framer-motion';
import { useBranding } from '../contexts/BrandingContext';
import { useTheme } from '../contexts/ThemeContext';
import { getStudentTerm } from '../utils/terminology';
import BottomNav from '../components/BottomNav';
import fallbackLogo from '../assets/ic_launcher.png';

interface HomePageProps {
    userName: string;
    onSignOut: () => void;
}

export default function HomePage({ userName, onSignOut }: HomePageProps) {
    const navigate = useNavigate();
    const isOnline = useOnlineStatus();
    const { theme, toggleTheme } = useTheme();
    const [grupos, setGrupos] = useState<(GrupoClase & { completada?: boolean })[]>([]);
    const [loading, setLoading] = useState(true);
    const { entityType, logoUrl, orgName, isAdmin } = useBranding();

    useEffect(() => {
        let mounted = true;

        const runEffect = async () => {
            if (!mounted) return;

            loadGrupos();
            if (isOnline && mounted) {
                try {
                    const count = await sincronizarPendientes();
                    if (count > 0 && mounted) {
                        loadGrupos();
                    }
                } catch (err) {
                    // Silent fail for background sync
                }
            }
        };

        runEffect();

        return () => { mounted = false; };
    }, [isOnline]);

    const loadGrupos = async () => {
        try {
            const data = await getGruposDocente();

            // Check which groups have attendance records for today
            const today = getLocalISODate();
            const { data: attendanceData } = await supabase
                .from('asistencia_registros')
                .select('id_grupo')
                .eq('fecha_clase', today);

            const completedGroups = new Set(attendanceData?.map((r: any) => r.id_grupo) || []);

            const gruposConEstado = data.map((g: any) => ({
                ...g,
                completada: completedGroups.has(g.id)
            }));

            setGrupos(gruposConEstado);
        } catch (err) {
            // Silent fail - UI shows empty state
        } finally {
            setLoading(false);
        }
    };

    const today = new Date();
    const dateStr = today.toLocaleDateString('es-NI', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const firstName = userName?.split(' ')[0] || 'Profesor';

    /** Badge status helper — returns class + label, no emojis */
    const getBadge = (grupo: GrupoClase & { completada?: boolean }) => {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = dayNames[new Date().getDay()];
        const isToday = grupo.dias?.includes(todayName);

        if (grupo.completada) return { cls: 'badge-success', label: 'Completada' };
        if (!grupo.dias || !isToday) return { cls: 'badge-inactive', label: 'No hoy' };
        return { cls: 'badge-pending', label: 'Pendiente' };
    };

    return (
        <AnimatedPage className="app-layout">
            {/* ── Header ─────────────────────────────────────────── */}
            <header className="app-header">
                <div className="header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                            src={logoUrl || fallbackLogo}
                            alt={orgName || 'Logo SENTINEL'}
                            style={{
                                height: '38px',
                                width: '38px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                            }}
                            onError={(e) => { (e.target as HTMLImageElement).src = fallbackLogo; }}
                        />
                        <div>
                            <h1>Hola, Prof. {firstName}</h1>
                            <p className="subtitle capitalize">{dateStr}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {/* Theme toggle — vector icon, no emoji */}
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle"
                            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            <Icon
                                name={theme === 'dark' ? 'sun' : 'moon'}
                                size={18}
                                color="rgba(255,255,255,0.9)"
                            />
                        </button>
                        <div className={`connection-indicator ${isOnline ? 'connection-online' : 'connection-offline'}`}>
                            <span className="connection-dot" />
                            <span className="text-xs text-white-80">
                                {isOnline ? 'En línea' : 'Sin conexión'}
                            </span>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => navigate('/admin/settings', { replace: true })}
                                className="logout-btn"
                                aria-label="Configuración Admin"
                                title="Panel de Administración"
                            >
                                <Icon name="settings" size={20} color="rgba(255,255,255,0.9)" />
                            </button>
                        )}
                        <button
                            onClick={onSignOut}
                            className="logout-btn"
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                        >
                            <Icon name="logout" size={18} color="rgba(255,255,255,0.9)" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Quick Actions Grid ─────────────────────────────── */}
            <div className="home-actions-strip">
                <button className="action-chip" onClick={() => navigate('/create-class')}>
                    <span className="action-chip-icon">
                        <Icon name="plus" size={20} color="#fff" />
                    </span>
                    <span className="action-chip-text">Nueva Clase</span>
                </button>
                <button className="action-chip" onClick={() => navigate('/select-class-list')}>
                    <span className="action-chip-icon">
                        <Icon name="users" size={20} color="#fff" />
                    </span>
                    <span className="action-chip-text">{getStudentTerm(entityType, true)}</span>
                </button>
                <button className="action-chip" onClick={() => navigate('/reportes')}>
                    <span className="action-chip-icon">
                        <Icon name="chart" size={20} color="#fff" />
                    </span>
                    <span className="action-chip-text">Reportes</span>
                </button>
            </div>

            {/* ── Class List ─────────────────────────────────────── */}
            <main className="page pb-24">
                <p className="section-title">Mis Clases</p>

                {loading ? (
                    <div className="loading-screen">
                        <div className="spinner" />
                        <p className="text-secondary">Cargando clases...</p>
                    </div>
                ) : grupos.length === 0 ? (
                    <div className="empty-state">
                        <img
                            src={new URL('../assets/illustrations/empty-classes.png', import.meta.url).href}
                            alt="Sin clases"
                            className="empty-state-img-lg"
                        />
                        <h3>Sin clases aún</h3>
                        <p>Crea tu primera clase para empezar a registrar asistencia</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/create-class')}
                        >
                            <Icon name="plus" size={18} color="#fff" />
                            Crear clase
                        </button>
                    </div>
                ) : (
                    <AnimatedList className="class-list-container">
                        {grupos.map((grupo) => {
                            const badge = getBadge(grupo);
                            const isCompleted = badge.cls.includes('success');
                            const isPending = badge.cls.includes('pending') || badge.label === 'Hoy';
                            const isInactive = badge.cls.includes('inactive');
                            
                            const indicatorClass = isCompleted 
                                ? 'class-card-indicator--completed' 
                                : isPending 
                                    ? 'class-card-indicator--pending' 
                                    : 'class-card-indicator--inactive';

                            return (
                                <motion.li
                                    variants={itemVariant}
                                    key={grupo.id}
                                    className="class-card"
                                    onClick={() => navigate(`/clase/${grupo.id}`)}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Status Indicator Bar */}
                                    <div className={`class-card-indicator ${indicatorClass}`} />

                                    <div className="class-card-header">
                                        <div className="class-card-info">
                                            <h3 className="class-card-title text-lg font-bold leading-tight">
                                                {grupo.nombre_asignatura}
                                            </h3>
                                            {grupo.codigo_grupo && (
                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">
                                                    Grupo: {grupo.codigo_grupo}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`card-badge ${badge.cls} text-[10px] uppercase font-bold tracking-tighter`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="class-card-meta flex items-center gap-2">
                                            <Icon name="clock" size={14} color="var(--color-text-hint)" />
                                            <span className="text-xs font-medium text-gray-400">
                                                {grupo.horario}
                                                {grupo.hora_inicio && ` (${grupo.hora_inicio.substring(0, 5)})`}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                            <Icon name="users" size={12} color="var(--color-text-hint)" />
                                            <span>Inscritos</span>
                                        </div>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatedList>
                )}
            </main>

            {/* ── Bottom Navigation ──────────────────────────────── */}
            <BottomNav />
        </AnimatedPage>
    );
}
