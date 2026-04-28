/// <reference types="vite/client" />

declare module '*.svg?react' {
    import { SVGProps, FC } from 'react';
    const SVG: FC<SVGProps<SVGSVGElement>>;
    export default SVG;
}

declare module '*.png' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}