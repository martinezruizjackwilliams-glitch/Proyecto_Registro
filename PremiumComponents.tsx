import { QrCode, User, Clock, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScanButtonProps {
  onClick: () => void;
  primaryColor?: string;
}

export function ScanButton({ onClick, primaryColor = 'var(--color-primary)' }: ScanButtonProps) {
  const contrastColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-foreground').trim() || '#ffffff';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className="group relative flex items-center justify-center gap-3 px-8 py-4 overflow-hidden rounded-2xl transition-all shadow-xl"
      style={{
        backgroundColor: primaryColor,
        color: contrastColor,
        boxShadow: `0 10px 40px ${primaryColor}33`,
      }}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      <QrCode className="w-6 h-6" />
      <span className="font-bold tracking-tight uppercase">Iniciar Escaneo</span>
    </motion.button>
  );
}

interface AttendanceCardProps {
  name: string;
  idNumber: string;
  status: 'presente' | 'tarde' | 'ausente';
  estado?: string;
  onStatusChange?: (newStatus: string) => void;
}

export function AttendanceCard({ name, idNumber, status, estado }: AttendanceCardProps) {
  const statusKey = status || estado || 'ausente';

  const getStatusStyle = () => {
    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary').trim() || '#2E7D32';
    const foreground = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-foreground').trim() || '#ffffff';

    switch (statusKey) {
      case 'presente':
        return { bg: `${primary}15`, color: primary, border: primary };
      case 'tarde':
        return { bg: '#FEF3C7', color: '#B45309', border: '#F59E0B' };
      case 'ausente':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#EF4444' };
      default:
        return { bg: `${primary}15`, color: primary, border: primary };
    }
  };

  const style = getStatusStyle();

  const statusLabels: Record<string, string> = {
    presente: 'PRESENTE',
    tarde: 'TARDE',
    ausente: 'AUSENTE',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-5 transition-all hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">
              {name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ID: {idNumber}
            </p>
          </div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
          style={{
            borderColor: style.border,
            color: style.color,
            backgroundColor: style.bg,
          }}
        >
          {statusLabels[statusKey] || 'AUSENTE'}
        </div>
      </div>
    </motion.div>
  );
}