import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CreateClassPage from './pages/CreateClassPage';
import AddStudentsPage from './pages/AddStudentsPage';
import ClassDetailPage from './pages/ClassDetailPage';
import QRCardsPage from './pages/QRCardsPage';
import SelectClassScanPage from './pages/SelectClassScanPage';
import ScanSessionPage from './pages/ScanSessionPage';
import ClassSummaryPage from './pages/ClassSummaryPage';
import ReportsPage from './pages/ReportsPage';
import EditClassPage from './pages/EditClassPage';
import NfcScanPage from './pages/NfcScanPage';
import AttendanceReviewPage from './pages/AttendanceReviewPage';
import SelectClassListPage from './pages/SelectClassListPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import BrandSetupPage from './pages/BrandSetupPage';
import UnassignedPage from './pages/UnassignedPage';
import { SyncIndicator } from './components/SyncIndicator';
import { useBranding } from './contexts/BrandingContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { useEffect } from 'react';
import { initSyncService } from './services/syncService';
import fallbackLogo from './assets/ic_launcher.png';

function LoadingScreen({ logoUrl }: { logoUrl: string | null }) {
    // Fallback: si no hay logo, usar un emoji o texto
    const showLogo = logoUrl || fallbackLogo;
    
    return (
        <div className="global-loading-screen" style={{
            background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%)',
        }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                className="loading-logo-container"
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 20,
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                }}
            >
                <img 
                    src={showLogo} 
                    alt="SENTINEL" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        // Si falla, mostrar emoji como fallback
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '🎓';
                    }}
                />
            </motion.div>
            <div className="spinner" style={{ borderTopColor: 'white' }} />
            <p className="loading-text" style={{ color: 'white' }}>Cargando SENTINEL...</p>
        </div>
    );
}

export default function App() {
    const { user, loading: authLoading, signIn, signUp, signOut, resetPassword } = useAuth();
    const { logoUrl, loading: brandingLoading, isAdmin, userRole, isUnassigned } = useBranding();

    useEffect(() => {
        initSyncService();
    }, []);

    if (authLoading || brandingLoading) {
        return <LoadingScreen logoUrl={logoUrl} />;
    }

    if (!user) {
        return <LoginPage onLogin={signIn} onSignUp={signUp} onResetPassword={resetPassword} />;
    }

    if (isUnassigned) {
        return <UnassignedPage onSignOut={signOut} />;
    }

    const userName = user.user_metadata?.nombre_completo ||
                     user.user_metadata?.nombre ||
                     user.email?.split('@')[0] ||
                     'Usuario';

    const isDirectorOrCoordinador = userRole === 'director' || userRole === 'coordinador';

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={
                    isDirectorOrCoordinador 
                        ? <Navigate to="/admin/settings" replace /> 
                        : <HomePage userName={userName} onSignOut={signOut} />
                } />
                <Route path="/create-class" element={<CreateClassPage userId={user.id} />} />
                <Route path="/select-class-scan" element={<SelectClassScanPage />} />
                <Route path="/select-class-list" element={<SelectClassListPage />} />
                <Route path="/clase/:id" element={<ClassDetailPage />} />
                <Route path="/edit-class/:id" element={<EditClassPage />} />
                <Route path="/add-students/:id" element={<AddStudentsPage />} />
                <Route path="/qr-cards/:id" element={<QRCardsPage />} />
                <Route path="/scan/:id" element={<ScanSessionPage />} />
                <Route path="/nfc-scan/:id" element={<NfcScanPage />} />
                <Route path="/attendance-review/:id" element={<AttendanceReviewPage />} />
                <Route path="/summary/:id" element={<ClassSummaryPage userName={userName} />} />
                <Route path="/reportes" element={<ReportsPage userName={userName} />} />
                <Route path="/reportes/:id" element={<ReportsPage userName={userName} />} />
                <Route path="/admin/settings" element={
                    <ProtectedRoute isAllowed={isAdmin} isLoading={brandingLoading} redirectTo="/">
                        <AdminSettingsPage onSignOut={signOut} />
                    </ProtectedRoute>
                } />
                <Route path="/admin/brand" element={
                    <ProtectedRoute isAllowed={isAdmin} isLoading={brandingLoading} redirectTo="/">
                        <BrandSetupPage onSignOut={signOut} />
                    </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <SyncIndicator />
        </BrowserRouter>
    );
}
