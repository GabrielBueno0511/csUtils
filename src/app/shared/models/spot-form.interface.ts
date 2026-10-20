export interface SpotFormData {
    readonly mapId: string;
    readonly spotId: string;
    readonly spotName: string;
    readonly throwType: ThrowType;
    readonly positionImage: File | null;
    readonly crosshairImage: File | null;
}

export interface SpotNameOption {
    readonly value: string;
    readonly label: string;
}

export const SPOT_NAME_OPTIONS: readonly SpotNameOption[] = [
    { value: 'janela', label: 'Janela' },
    { value: 'cabecinha', label: 'Cabecinha' },
    { value: 'fundo', label: 'Fundo' },
    { value: 'xbox', label: 'Xbox' },
    { value: 'varanda', label: 'Varanda' },
    { value: 'outro', label: 'Outro' },
];

export type ThrowType =
    | 'normal'
    | 'jump-throw'
    | 'run-throw'
    | 'crouch-throw'
    | 'walk-throw';

export interface ThrowTypeOption {
    readonly value: ThrowType;
    readonly label: string;
}

export const THROW_TYPE_OPTIONS: readonly ThrowTypeOption[] = [
    { value: 'normal', label: 'Normal (Clique Direito)' },
    { value: 'jump-throw', label: 'Jump Throw' },
    { value: 'run-throw', label: 'Run Throw' },
    { value: 'crouch-throw', label: 'Crouch Throw' },
    { value: 'walk-throw', label: 'Walk Throw' },
];
