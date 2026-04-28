import { useState, useEffect } from 'react';
import { Cloud, CloudOff, CloudSnow, RefreshCw, Clock } from 'lucide-react';
import { LocalStorage } from '../utils/localStorage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type SyncState = 'synced' | 'pending' | 'offline' | 'syncing';

export const SyncIndicator = () => {
    const isOnline = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [syncState, setSyncState] = useState<SyncState>('synced');

    useEffect(() => {
        const checkQueue = async () => {
            const queue = await LocalStorage.getQueue();
            setPendingCount(queue.length);
            
            if (!isOnline) {
                setSyncState('offline');
            } else if (queue.length > 0) {
                setSyncState('pending');
            } else {
                setSyncState('synced');
            }
        };

        checkQueue();
        const interval = setInterval(checkQueue, 3000);
        return () => clearInterval(interval);
    }, [isOnline]);

    // No mostrar si todo está sincronizado
    if (syncState === 'synced') return null;

    const stateConfig = {
        synced: { icon: <Cloud size={16} />, bg: 'rgba(34, 197, 94, 0.9)', label: 'Sincronizado' },
        pending: { icon: <Clock size={16} />, bg: 'rgba(249, 115, 22, 0.9)', label: `${pendingCount} pendientes` },
        offline: { icon: <CloudOff size={16} />, bg: 'rgba(239, 68, 68, 0.9)', label: 'Sin conexión' },
        syncing: { icon: <RefreshCw className="animate-spin" size={16} />, bg: 'rgba(59, 130, 246, 0.9)', label: 'Sincronizando...' },
    };

    const config = stateConfig[syncState];

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '16px',
            backgroundColor: config.bg,
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.3s ease'
        }}>
            {config.icon}
            <span>{config.label}</span>
        </div>
    );
};
