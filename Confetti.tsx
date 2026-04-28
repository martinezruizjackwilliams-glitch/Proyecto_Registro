import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    rotation: number;
    size: number;
}

export function Confetti({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (!active) {
            setPieces([]);
            return;
        }

        const colors = ['#2E7D32', '#FBC02D', '#4CAF50', '#FFD54F', '#ffffff'];
        const newPieces: ConfettiPiece[] = [];
        
        for (let i = 0; i < 50; i++) {
            newPieces.push({
                id: i,
                x: Math.random() * 100, // % position
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 720 - 360,
                size: Math.random() * 8 + 6,
            });
        }
        
        setPieces(newPieces);
        
        const timer = setTimeout(() => {
            onComplete?.();
        }, 3000);
        
        return () => clearTimeout(timer);
    }, [active, onComplete]);

    if (!active || pieces.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {pieces.map((piece) => (
                <motion.div
                    key={piece.id}
                    className="absolute top-0"
                    style={{
                        left: `${piece.x}%`,
                        width: piece.size,
                        height: piece.size * 0.6,
                        backgroundColor: piece.color,
                        borderRadius: '2px',
                    }}
                    initial={{
                        y: -20,
                        rotate: 0,
                        opacity: 1,
                    }}
                    animate={{
                        y: window.innerHeight + 100,
                        rotate: piece.rotation,
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: 3,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}
