import { motion } from 'framer-motion';

export function ScannerOverlay() {
    return (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder frame */}
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-64 h-64 border-2 border-[#FBC02D]/50 rounded-[40px] relative"
            >
                {/* Corner Lasers */}
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-[#FBC02D] rounded-tl-xl" />
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-[#FBC02D] rounded-tr-xl" />
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-[#FBC02D] rounded-bl-xl" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-[#FBC02D] rounded-br-xl" />
                
                {/* Animated Scan Line */}
                <motion.div 
                    animate={{ 
                        top: ['10%', '85%', '10%'],
                        opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                        duration: 2.5, 
                        repeat: Infinity, 
                        ease: "linear" 
                    }}
                    className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#FBC02D] to-transparent shadow-[0_0_15px_rgba(251,192,45,0.8)]"
                />
                
                {/* Center aim dot */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#FBC02D] rounded-full shadow-[0_0_10px_#FBC02D]"
                />
            </motion.div>
            
            {/* Labels */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/20"
            >
                <p className="text-white text-sm font-medium tracking-wide">
                    Escaneando código QR...
                </p>
            </motion.div>
        </div>
    );
}
