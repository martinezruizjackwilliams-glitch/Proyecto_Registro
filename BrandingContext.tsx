import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { getLocalLogo } from '../utils/logos';
import type { Organizacion, Perfil } from '../types';

export const ADMIN_ROLES = ['coordinador', 'director', 'admin'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
};

interface BrandingData {
    orgId: string | null;
    orgName: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    entityType: 'estudiante' | 'empleado' | null;
    userRole: string | null;
    isAdmin: boolean;
    isUnassigned: boolean;
    loading: boolean;
    nomenclatura: {
        sede: string;
        facultad: string;
        carrera: string;
    };
    refreshBranding: () => void;
}

const defaultBranding: BrandingData = {
    orgId: null,
    orgName: null,
    logoUrl: getLocalLogo(),
    primaryColor: '#2E7D32',
    secondaryColor: '#FBC02D',
    accentColor: '#2E7D32',
    entityType: 'estudiante',
    userRole: null,
    isAdmin: false,
    isUnassigned: false,
    loading: false,
    nomenclatura: {
        sede: 'Sede',
        facultad: 'Facultad',
        carrera: 'Carrera',
    },
    refreshBranding: () => {},
};

// Paleta SENTINEL fallback (oscura premium)
const SENTINEL_PALETTE = {
    primary: '#6C63FF',
    secondary: '#38BDF8',
    accent: '#F472B6',
};

const BrandingContext = createContext<BrandingData>(defaultBranding);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [branding, setBranding] = useState<BrandingData>(defaultBranding);
    const [refreshKey, setRefreshKey] = useState(0);
    const isUnassignedRef = useRef(false);
    const refreshBrandingRef = useRef<() => void>(() => {});

    const refreshBranding = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    refreshBrandingRef.current = refreshBranding;

    useEffect(() => {
        let mounted = true;

        const fetchBranding = async () => {
            if (!user) {
                if (mounted) setBranding({ ...defaultBranding, loading: false, refreshBranding: refreshBrandingRef.current });
                return;
            }

            try {
                const { data: profile, error: profileError } = await supabase
                    .from('perfiles')
                    .select('id_organizacion, rol')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error('[BrandingContext] Profile error:', profileError.message);
                    if (mounted) setBranding({ ...defaultBranding, loading: false, refreshBranding: refreshBrandingRef.current });
                    return;
                }

                console.log('[BrandingContext] Profile:', profile);

                const orgId = profile?.id_organizacion;
                console.log('[BrandingContext] orgId:', orgId);

                if (orgId) {
                    const { data: org, error: orgError } = await supabase
                        .from('organizaciones')
                        .select('id, nombre, logo_url, color_primario, color_secundario, color_acento, tipo_organizacion, nomenclatura')
                        .eq('id', orgId)
                        .single();

                    if (orgError) {
                        console.error('[BrandingContext] Org error:', orgError.message);
                    }

                    console.log('[BrandingContext] Org data:', org);

                    if (org && mounted) {
                        const parsedNomenclatura = typeof org.nomenclatura === 'string'
                            ? JSON.parse(org.nomenclatura)
                            : (org.nomenclatura || {});

                        const userRole = profile.rol || 'docente';
                        const isAdmin = ADMIN_ROLES.includes(userRole as AdminRole);

                        isUnassignedRef.current = false;
                        setBranding({
                            orgId: org.id,
                            orgName: org.nombre || null,
                            logoUrl: org.logo_url || null,
                            primaryColor: org.color_primario || null,
                            secondaryColor: org.color_secundario || null,
                            accentColor: org.color_acento || null,
                            entityType: (org.tipo_organizacion as any) || 'estudiante',
                            userRole,
                            isAdmin,
                            isUnassigned: false,
                            loading: false,
                            nomenclatura: {
                                sede: parsedNomenclatura?.sede || 'Sede',
                                facultad: parsedNomenclatura?.facultad || 'Facultad',
                                carrera: parsedNomenclatura?.carrera || 'Carrera',
                            },
                            refreshBranding: refreshBrandingRef.current,
                        });
                        console.log('[BrandingContext] Branding applied successfully');
                        return;
                    } else if (!org) {
                        console.log('[BrandingContext] Org not found or null');
                    }
                }

                if (mounted) {
                    isUnassignedRef.current = true;
                    setBranding({
                        ...defaultBranding,
                        userRole: profile?.rol || 'docente',
                        isAdmin: ADMIN_ROLES.includes((profile?.rol as AdminRole) || '' as any),
                        isUnassigned: true,
                        loading: false,
                        refreshBranding: refreshBrandingRef.current,
                    });
                }

            } catch (error) {
                console.error('Error fetching branding:', error);
                if (mounted) setBranding({ ...defaultBranding, loading: false, refreshBranding: refreshBrandingRef.current });
            }
        };

        fetchBranding();

        let intervalId: ReturnType<typeof setInterval> | null = null;
        
        if (user) {
            intervalId = setInterval(() => {
                if (isUnassignedRef.current) {
                    fetchBranding();
                } else if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }, 3000);
        }

        return () => {
            mounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [user, refreshKey]);

    // Motor CSS: inyectar variables de tema en :root
    useEffect(() => {
        const root = document.documentElement;
        const primary = branding.primaryColor || SENTINEL_PALETTE.primary;

        // Primary
        root.style.setProperty('--color-primary', primary);
        // Primary Foreground (contraste automático)
        root.style.setProperty('--primary-foreground', getContrastColor(primary));
        // Secondary
        root.style.setProperty('--color-secondary',
            branding.secondaryColor || SENTINEL_PALETTE.secondary
        );
        // Accent / Terciario
        root.style.setProperty('--color-accent',
            branding.accentColor || SENTINEL_PALETTE.accent
        );
    }, [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

    return (
        <BrandingContext.Provider value={branding}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => useContext(BrandingContext);
