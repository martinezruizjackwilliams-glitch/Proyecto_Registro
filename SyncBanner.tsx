import React from 'react';
import '../styles/components.css';

interface SyncBannerProps {
    hasPending: boolean;
    syncing: boolean;
    onSync: () => Promise<void>;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ hasPending, syncing, onSync }) => {
    if (!hasPending) return null;

    return (
        <div className="sync-banner">
            <div className="sync-content">
                <div className="sync-icon">☁️</div>
                <div className="sync-text">
                    <strong>Sincronización pendiente</strong>
                    <p>Hay datos guardados localmente que necesitan subirse.</p>
                </div>
            </div>
            <button 
                className="sync-btn"
                onClick={onSync}
                disabled={syncing}
            >
                {syncing ? '...' : 'Sincronizar'}
            </button>
        </div>
    );
};
