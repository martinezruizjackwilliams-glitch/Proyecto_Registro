import { HTMLAttributes } from 'react';

type IconName =
    | 'home'
    | 'reports'
    | 'settings'
    | 'scan'
    | 'qr-camera'
    | 'qr-phone'
    | 'nfc'
    | 'users'
    | 'clock'
    | 'plus'
    | 'trash'
    | 'list'
    | 'moon'
    | 'sun'
    | 'logout'
    | 'arrow-left'
    | 'edit'
    | 'chart';

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
    name: IconName;
    active?: boolean;
    size?: number;
    /** Override the icon color directly */
    color?: string;
}

// File-based icons (SVGs in assets)
const iconFiles: Partial<Record<IconName, string>> = {
    home: new URL('../assets/icons/icon-home.svg', import.meta.url).href,
    reports: new URL('../assets/icons/icon-reports.svg', import.meta.url).href,
    settings: new URL('../assets/icons/icon-settings.svg', import.meta.url).href,
    scan: new URL('../assets/icons/icon-scan.svg', import.meta.url).href,
    'qr-camera': new URL('../assets/icons/icon-qr-camera.svg', import.meta.url).href,
    'qr-phone': new URL('../assets/icons/icon-qr-phone.svg', import.meta.url).href,
    nfc: new URL('../assets/icons/icon-nfc-antenna.svg', import.meta.url).href,
};

/**
 * Inline SVG path data for icons that don't have external SVG files.
 * Uses standard 24x24 viewBox paths (Lucide-compatible).
 */
const inlineSvgPaths: Partial<Record<IconName, string>> = {
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2',
    plus: 'M12 5v14M5 12h14',
    trash: 'M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
    sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
    edit: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
    chart: 'M18 20V10M12 20V4M6 20v-6',
};

export const Icon = ({ name, active = false, size = 24, color, style, className = '', ...props }: IconProps) => {
    const resolvedColor = color ?? (active ? '#2E7D32' : '#9CA3AF');
    const fileUrl = iconFiles[name];

    // If we have a file-based SVG, use the mask approach
    if (fileUrl) {
        return (
            <span
                style={{
                    display: 'inline-block',
                    width: size,
                    height: size,
                    backgroundColor: resolvedColor,
                    WebkitMaskImage: `url(${fileUrl})`,
                    WebkitMaskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskImage: `url(${fileUrl})`,
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    transition: 'background-color 0.2s ease',
                    verticalAlign: 'middle',
                    flexShrink: 0,
                    ...style,
                }}
                className={className}
                {...props}
            />
        );
    }

    // Inline SVG fallback for icons without external files
    const pathData = inlineSvgPaths[name];
    if (pathData) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke={resolvedColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                style={{
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    flexShrink: 0,
                    transition: 'stroke 0.2s ease',
                    ...style,
                }}
                {...(props as any)}
            >
                <path d={pathData} />
            </svg>
        );
    }

    // Ultimate fallback: use home icon
    const fallbackUrl = iconFiles.home!;
    return (
        <span
            style={{
                display: 'inline-block',
                width: size,
                height: size,
                backgroundColor: resolvedColor,
                WebkitMaskImage: `url(${fallbackUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${fallbackUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                transition: 'background-color 0.2s ease',
                verticalAlign: 'middle',
                flexShrink: 0,
                ...style,
            }}
            className={className}
            {...props}
        />
    );
};

export default Icon;
