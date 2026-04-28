import { Preferences } from '@capacitor/preferences';

const SYNC_QUEUE_KEY = 'sync_queue';

export interface SyncAction {
    id: string;
    type: 'ADD_ATTENDANCE' | 'ADD_STUDENT_MANUAL' | 'ADD_STUDENT_LIST';
    payload: any;
    timestamp: number;
}

export const LocalStorage = {
    // Manejo de la Cola de Sincronización
    async addToQueue(action: Omit<SyncAction, 'timestamp'>): Promise<void> {
        try {
            const queue = await this.getQueue();
            const newAction: SyncAction = {
                ...action,
                timestamp: Date.now()
            };
            
            // Evitar duplicados exactos en la cola si es posible
            const isDuplicate = queue.some(item => 
                item.type === newAction.type && 
                JSON.stringify(item.payload) === JSON.stringify(newAction.payload)
            );
            
            if (!isDuplicate) {
                queue.push(newAction);
                await Preferences.set({
                    key: SYNC_QUEUE_KEY,
                    value: JSON.stringify(queue)
                });
            }
        } catch (err) {
            console.error('Error adding to sync queue:', err);
        }
    },

    async getQueue(): Promise<SyncAction[]> {
        try {
            const { value } = await Preferences.get({ key: SYNC_QUEUE_KEY });
            return value ? JSON.parse(value) : [];
        } catch (err) {
            console.error('Error getting sync queue:', err);
            return [];
        }
    },

    async removeFromQueue(id: string): Promise<void> {
        try {
            const queue = await this.getQueue();
            const updatedQueue = queue.filter(item => item.id !== id);
            await Preferences.set({
                key: SYNC_QUEUE_KEY,
                value: JSON.stringify(updatedQueue)
            });
        } catch (err) {
            console.error('Error removing from sync queue:', err);
        }
    },

    async clearQueue(): Promise<void> {
        try {
            await Preferences.remove({ key: SYNC_QUEUE_KEY });
        } catch (err) {
            console.error('Error clearing sync queue:', err);
        }
    },

    // Otras utilidades si son necesarias
    async saveItem(key: string, value: any): Promise<void> {
        await Preferences.set({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value)
        });
    },

    async getItem(key: string): Promise<any> {
        const { value } = await Preferences.get({ key });
        try {
            return value ? JSON.parse(value) : null;
        } catch {
            return value;
        }
    }
};
