import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'slide' | 'fade' | 'scale';
}

const pageVariants = {
    default: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
    },
    slide: {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
    },
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    },
    scale: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
    },
};

export function AnimatedPage({ children, className = '', variant = 'default' }: AnimatedPageProps) {
    const selectedVariant = pageVariants[variant];

    return (
        <motion.div
            initial={selectedVariant.initial}
            animate={selectedVariant.animate}
            exit={selectedVariant.exit}
            transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={`w-full h-full ${className}`}
        >
            {children}
        </motion.div>
    );
}

interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export function StaggerContainer({ children, className = '', delay = 0.05 }: StaggerContainerProps) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        delayChildren: delay,
                        staggerChildren: delay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
    className?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.4, direction = 'up', className = '' }: FadeInProps) {
    const directions = {
        up: { y: 20 },
        down: { y: -20 },
        left: { x: 20 },
        right: { x: -20 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directions[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface ScaleInProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export function ScaleIn({ children, delay = 0, className = '' }: ScaleInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                delay,
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface BounceInProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export function BounceIn({ children, delay = 0, className = '' }: BounceInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                delay,
                duration: 0.5,
                type: 'spring',
                stiffness: 260,
                damping: 20,
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface SuccessAnimationProps {
    show: boolean;
    onComplete?: () => void;
}

export function SuccessAnimation({ show, onComplete }: SuccessAnimationProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm"
                    onClick={onComplete}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="bg-white rounded-full p-8 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.svg
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        >
                            <motion.circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="#4CAF50"
                                strokeWidth="4"
                                className="checkmark-circle"
                            />
                            <motion.path
                                d="M30 50 L45 65 L70 35"
                                fill="none"
                                stroke="#4CAF50"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                            />
                        </motion.svg>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface SkeletonProps {
    variant?: 'text' | 'title' | 'avatar' | 'card' | 'button';
    width?: string;
    height?: string;
    className?: string;
}

export function Skeleton({ variant = 'text', width, height, className = '' }: SkeletonProps) {
    const baseClass = 'skeleton';
    const variantClasses = {
        text: 'skeleton-text',
        title: 'skeleton-title',
        avatar: 'skeleton-avatar',
        card: 'skeleton-card',
        button: 'rounded-lg h-12',
    };

    return (
        <div
            className={`${baseClass} ${variantClasses[variant]} ${className}`}
            style={{ width, height }}
        />
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton variant="avatar" />
                    <div className="flex-1">
                        <Skeleton variant="title" />
                        <Skeleton variant="text" width="80%" />
                    </div>
                </div>
            ))}
        </div>
    );
}

interface CountUpProps {
    value: number;
    duration?: number;
    className?: string;
}

export function CountUp({ value, className = '' }: CountUpProps) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={className}
        >
            {value}
        </motion.span>
    );
}

interface PulseButtonProps {
    children: ReactNode;
    onClick?: () => void;
    active?: boolean;
    className?: string;
}

export function PulseButton({ children, onClick, active = false, className = '' }: PulseButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.95 }}
            className={`relative overflow-hidden ${className}`}
        >
            {children}
            {active && (
                <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ scale: 0, borderRadius: '100%' }}
                    animate={{ scale: 2, borderRadius: '100%', opacity: 0 }}
                    transition={{ duration: 0.5 }}
                />
            )}
        </motion.button>
    );
}
