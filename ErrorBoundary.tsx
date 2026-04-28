import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary global — captura cualquier error de renderizado en el árbol React
 * y muestra una pantalla de recuperación en lugar de una pantalla en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100dvh',
                    padding: '2rem',
                    background: 'var(--color-background, #0f172a)',
                    color: 'var(--color-text, #f1f5f9)',
                    textAlign: 'center',
                    gap: '1rem',
                }}>
                    <div style={{ fontSize: '3rem' }}>⚠️</div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        Algo salió mal
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary, #94a3b8)', margin: 0, maxWidth: '320px', lineHeight: 1.5 }}>
                        La aplicación encontró un error inesperado. Tus datos están seguros.
                    </p>
                    {this.state.error && (
                        <code style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            padding: '0.75rem 1rem',
                            fontSize: '0.7rem',
                            color: '#f87171',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            display: 'block',
                        }}>
                            {this.state.error.message}
                        </code>
                    )}
                    <button
                        onClick={this.handleReset}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem 2rem',
                            background: 'var(--color-primary, #6366f1)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
