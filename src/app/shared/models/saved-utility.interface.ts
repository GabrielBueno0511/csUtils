import { ThrowType } from './utility-form.interface';

export interface SavedUtility {
    readonly id: string;
    readonly authorId?: number | string | null;
    readonly authorName?: string | null;
    readonly mapId: string;
    readonly utilityType: 'smoke' | 'molotov' | 'flashbang' | 'he';
    readonly pixelName: string;
    readonly throwType: ThrowType;
    readonly positionImageUrl: string;
    readonly crosshairImageUrl: string;
}
