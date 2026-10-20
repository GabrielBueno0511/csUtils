import { ThrowType } from './spot-form.interface';

export interface SavedUtility {
    readonly id: string;
    readonly authorId?: number | string | null;
    readonly authorName?: string | null;
    readonly mapId: string;
    readonly spotNameId: string; // "cabecinha", "janela" etc
    readonly identifier: string; // Identificador livre, ex: "spot gabriel A"
    readonly throwType: ThrowType;
    readonly positionImageUrl: string;
    readonly crosshairImageUrl: string;
}
