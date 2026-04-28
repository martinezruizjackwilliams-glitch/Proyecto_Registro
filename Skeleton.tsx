import { motion } from 'framer-motion';

export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton-sheader">
                <div className="skeleton shimmer" style={{ width: '60%', height: '24px', marginBottom: '8px' }} />
                <div className="skeleton shimmer" style={{ width: '40%', height: '16px' }} />
            </div>
            <div className="skeleton-sbody">
                <div className="skeleton-avatar shimmer" />
                <div className="skeleton-scontent">
                    <div className="skeleton shimmer" style={{ width: '80%', height: '18px', marginBottom: '6px' }} />
                    <div className="skeleton shimmer" style={{ width: '60%', height: '14px' }} />
                </div>
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="skeleton-list">
            {Array.from({ length: count }, (_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="skeleton-list-item"
                >
                    <div className="skeleton-avatar shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton shimmer" style={{ width: '70%', height: '16px', marginBottom: '8px' }} />
                        <div className="skeleton shimmer" style={{ width: '50%', height: '12px' }} />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="stats-grid">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="stat-card skeleton">
                    <div className="skeleton shimmer" style={{ width: '60%', height: '32px', margin: '0 auto 8px' }} />
                    <div className="skeleton shimmer" style={{ width: '80%', height: '14px', margin: '0 auto' }} />
                </div>
            ))}
        </div>
    );
}
