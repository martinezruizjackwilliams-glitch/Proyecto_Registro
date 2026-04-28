/**
 * Utility para obtener el logo de la organización
 * con fallback local si no hay conexión o no hay logo configurado
 */

import logoSentinel from '../assets/ic_launcher.png';

/**
 * Retorna el logo configurado de la organización o el fallback local
 */
export function getLocalLogo(): string {
    // Siempre retourne el logo local como fallback
    // El branding de la org se carga después
    return logoSentinel;
}

/**
 * URLs públicas de logos en Supabase Storage
 */
export const LOGO_URLS = {
    sentinel: logoSentinel,
};

/**
 * Obtiene la URL del logo para cargar en img src
 * con manejo de errores robusto
 */
export function getLogoUrl(orgLogoUrl: string | null): string {
    if (orgLogoUrl && orgLogoUrl.trim().length > 0) {
        return orgLogoUrl;
    }
    return LOGO_URLS.sentinel;
}