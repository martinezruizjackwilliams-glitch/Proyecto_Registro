import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { motion } from 'framer-motion';

interface BottomNavProps {
    /** Optional: override for a class-specific context (e.g. reports link includes classId) */
    classId?: string;
}

interface NavItem {
    id: string;
    label: string;
    icon: 'home' | 'scan' | 'reports' | 'settings';
    path: string;
    /** Paths that also count as "active" for this tab */
    matchPaths?: string[];
}

/**
 * BottomNav — Fixed bottom navigation bar.
 *
 * Design system:
 *   - bg-white / dark:bg-gray-900
 *   - Active icon:  Verde Bosque (#2E7D32)
 *   - Inactive icon: text-gray-400
 *   - Animated pill indicator
 */
export default function BottomNav({ classId }: BottomNavProps) {
    const navigate = useNavigate();
    const location = useLocation();

    const items: NavItem[] = [
        {
            id: 'home',
            label: 'Inicio',
            icon: 'home',
            path: '/',
            matchPaths: ['/'],
        },
        {
            id: 'scan',
            label: 'Escanear',
            icon: 'scan',
            path: classId ? `/scan/${classId}` : '/select-class-scan',
            matchPaths: ['/scan', '/select-class-scan', '/nfc-scan'],
        },
        {
            id: 'reports',
            label: 'Reportes',
            icon: 'reports',
            path: classId ? `/reportes/${classId}` : '/reportes',
            matchPaths: ['/reportes', '/summary'],
        },
        {
            id: 'settings',
            label: 'Ajustes',
            icon: 'settings',
            path: '/admin/settings',
            matchPaths: ['/admin'],
        },
    ];

    const isActive = (item: NavItem): boolean => {
        if (location.pathname === item.path) return true;
        return (item.matchPaths ?? []).some((p) => location.pathname.startsWith(p));
    };

    return (
        <nav
            className="bottom-nav"
            role="navigation"
            aria-label="Navegación principal"
        >
            {items.map((item) => {
                const active = isActive(item);
                return (
                    <button
                        key={item.id}
                        id={`nav-${item.id}`}
                        className={`bottom-nav-item ${active ? 'bottom-nav-item--active' : ''}`}
                        onClick={() => navigate(item.path, { replace: true })}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                    >
                        {active && (
                            <motion.div
                                layoutId="nav-pill"
                                className="bottom-nav-indicator"
                                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                            />
                        )}
                        <Icon
                            name={item.icon}
                            size={22}
                            active={active}
                            color={active ? 'var(--color-primary)' : 'var(--color-text-hint)'}
                        />
                        <span className="bottom-nav-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
