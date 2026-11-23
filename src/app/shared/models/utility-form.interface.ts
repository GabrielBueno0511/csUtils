export interface UtilityFormData {
    readonly mapId: string;
    readonly pixelName: string;
    readonly utilityType: UtilityType;
    readonly throwType: ThrowType;
    readonly positionImage: File | null;
    readonly crosshairImage: File | null;
}

export type UtilityType = 'smoke' | 'molotov' | 'flashbang' | 'he';

export interface UtilityTypeOption {
    readonly value: UtilityType;
    readonly label: string;
    readonly description: string;
}

export const UTILITY_TYPE_OPTIONS: readonly UtilityTypeOption[] = [
    { value: 'smoke', label: 'Smoke', description: 'Cortinas de fumaça' },
    { value: 'molotov', label: 'Molotov', description: 'Incendiárias e molotovs' },
    { value: 'flashbang', label: 'Bang', description: 'Granadas de luz' },
    { value: 'he', label: 'HE', description: 'Granadas explosivas' },
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
