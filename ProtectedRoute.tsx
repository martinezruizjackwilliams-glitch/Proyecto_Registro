import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    isAllowed: boolean;
    isLoading?: boolean;
    redirectTo?: string;
    children: ReactNode;
}

/**
 * Guarda de ruta declarativa.
 * - Mientras carga: muestra spinner (sin flash).
 * - Si no tiene permiso: redirige inmediatamente.
 * - Si tiene permiso: renderiza los children.
 */
export function ProtectedRoute({
    isAllowed,
    isLoading = false,
    redirectTo = '/',
    children,
}: ProtectedRouteProps) {
    if (isLoading) {
        return (
            <div className="global-loading-screen">
                <div className="spinner" />
            </div>
        );
    }

    if (!isAllowed) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
