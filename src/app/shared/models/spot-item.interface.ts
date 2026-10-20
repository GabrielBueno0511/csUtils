export interface SpotItem {
    readonly id: string;
    readonly name: string;
    readonly image: string;
    readonly description: string;
    readonly imageLabel: string;
    readonly imageNeedsConfirmation: boolean;
}

export interface MapSpotsData {
    readonly mapId: string;
    readonly mapName: string;
    readonly imageSourceUrl: string;
    readonly spots: readonly SpotItem[];
}
