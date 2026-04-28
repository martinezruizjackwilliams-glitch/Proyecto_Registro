import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import QRCodeLib from 'qrcode';
import type { Estudiante } from '../types';

/**
 * Unifies the sharing logic for student QR credentials.
 * 1. Generates or receives a Base64 image.
 * 2. Saves it to temporary cache.
 * 3. Shares the file URI via native Share API.
 */
export async function handleShareQR(estudiante: Estudiante, orgName: string = '') {
    try {
        const dataUrl = await QRCodeLib.toDataURL(estudiante.carnet, {
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

        // Extrae únicamente la data pura (remueve data:image/png;base64, etc.)
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");

        const fileName = `qr_${estudiante.carnet.replace(/[^a-zA-Z0-9]/g, '')}.png`;

        // Persistencia Nativa en Directory.Cache
        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        const title = orgName ? `Credencial QR - ${orgName}` : 'Credencial QR';

        // Invocación a Share API nativa
        await Share.share({
            title: title,
            url: result.uri,
            dialogTitle: 'Compartir Credencial'
        });

        return true;
    } catch (err) {
        console.error('Error in handleShareQR:', err);
        return false;
    }
}
