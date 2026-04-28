import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedListProps {
    children: ReactNode;
    className?: string;
}

const listVariant = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const itemVariant = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
    return (
        <motion.ul
            variants={listVariant}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.ul>
    );
}
