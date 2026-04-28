import { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/components.css';
import logoUrl from '../assets/ic_launcher.png';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onSignUp: (email: string, password: string, nombre: string) => Promise<void>;
    onResetPassword: (email: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onSignUp, onResetPassword }: LoginPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isResetMode, setIsResetMode] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            if (isResetMode) {
                await onResetPassword(email);
                setSuccess('Enlace de recuperación enviado. Revisa tu correo.');
            } else {
                await onLogin(email, password);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error de autenticación';
            
            // Mapear errores comunes a mensajes más útiles
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
                setError('Sin conexión. Verifica tu internet e intenta de nuevo.');
            } else if (errorMessage.includes('Invalid login credentials')) {
                setError('Credenciales inválidas. Verifica tu email y contraseña.');
            } else if (errorMessage.includes('User not found')) {
                setError('Usuario no encontrado. ¿Ya tienes cuenta?');
            } else if (errorMessage.includes('Email not confirmed')) {
                setError('Email no confirmado. Revisa tu bandeja de entrada.');
            } else if (errorMessage.includes('429') || errorMessage.includes('Too many requests')) {
                setError('Demasiados intentos. Espera un momento e intenta de nuevo.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Logo Area */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="auth-logo-header"
            >
                <div className="auth-logo-wrapper">
                    <img src={logoUrl} alt="Logo SENTINEL" />
                </div>
                <h1>SENTINEL</h1>
                <p>Plataforma de Gestión</p>
            </motion.div>

            {/* Form Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="auth-card"
            >
                <h2>{isResetMode ? 'Recuperar Cuenta' : 'Iniciar Sesión'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Correo Electrónico</label>
                        <input
                            id="email"
                            className="form-input"
                            type="email"
                            placeholder="usuario@institucion.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {!isResetMode && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                className="form-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="success-banner" style={{ marginBottom: '16px' }}>
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="spinner spinner-sm" />
                        ) : (
                            isResetMode ? 'Enviar Enlace' : 'Entrar'
                        )}
                    </button>

                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => {
                                setIsResetMode(!isResetMode);
                                setError('');
                                setSuccess('');
                            }}
                            style={{ color: 'var(--color-primary)', background: 'none', border: 'none', fontWeight: 600 }}
                        >
                            {isResetMode ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
                        </button>
                    </div>
                </form>
            </motion.div>

            <p className="footer-text">
                SENTINEL © 2026
            </p>
        </div>
    );
}
