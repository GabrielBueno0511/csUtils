import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MapItem } from '../../shared/models/map-item.interface';
import {
    ThrowType,
    THROW_TYPE_OPTIONS,
    ThrowTypeOption,
    SpotNameOption,
} from '../../shared/models/spot-form.interface';
import { UtilityService } from '../../shared/services/utility.service';
import { MAP_SPOTS_DATA } from '../../shared/data/map-spots.data';

interface ImagePreview {
    file: File;
    url: string;
}

@Component({
    selector: 'app-create-spot',
    standalone: true,
    imports: [FormsModule, RouterLink],
    templateUrl: './create-spot.html',
    styleUrl: './create-spot.scss',
})
export class CreateSpotComponent {
    private readonly router = inject(Router);
    private readonly utilityService = inject(UtilityService);

    protected readonly maps: MapItem[] = [
        { id: 'dust2', name: 'Dust 2', image: 'maps/dust2.png', route: '/map/dust2' },
        { id: 'mirage', name: 'Mirage', image: 'maps/mirage.png', route: '/map/mirage' },
        { id: 'inferno', name: 'Inferno', image: 'maps/inferno.png', route: '/map/inferno' },
        { id: 'nuke', name: 'Nuke', image: 'maps/nuke.png', route: '/map/nuke' },
        { id: 'ancient', name: 'Ancient', image: 'maps/ancient.png', route: '/map/ancient' },
        { id: 'anubis', name: 'Anubis', image: 'maps/anubis.png', route: '/map/anubis' },
        { id: 'cache', name: 'Cache', image: 'maps/cache.png', route: '/map/cache' },
    ];

    protected readonly throwTypes: readonly ThrowTypeOption[] = THROW_TYPE_OPTIONS;
    protected readonly spotNames = computed<readonly SpotNameOption[]>(() =>
        (MAP_SPOTS_DATA[this.selectedMapId()]?.spots ?? []).map(spot => ({ value: spot.id, label: spot.name })));

    protected onMapChange(mapId: string): void {
        this.selectedMapId.set(mapId);
        this.spotName.set('');
    }

    protected readonly selectedMapId = signal<string>('');
    protected readonly spotId = signal<string>('');
    protected readonly spotName = signal<string>('');
    protected readonly selectedThrowType = signal<ThrowType>('normal');
    protected readonly positionImage = signal<ImagePreview | null>(null);
    protected readonly crosshairImage = signal<ImagePreview | null>(null);
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly submitted = signal<boolean>(false);

    protected onFileSelected(event: Event, type: 'position' | 'crosshair'): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        const preview: ImagePreview = { file, url };

        if (type === 'position') {
            this.revokePreview(this.positionImage());
            this.positionImage.set(preview);
        } else {
            this.revokePreview(this.crosshairImage());
            this.crosshairImage.set(preview);
        }
    }

    protected removeImage(type: 'position' | 'crosshair'): void {
        if (type === 'position') {
            this.revokePreview(this.positionImage());
            this.positionImage.set(null);
        } else {
            this.revokePreview(this.crosshairImage());
            this.crosshairImage.set(null);
        }
    }

    protected get isFormValid(): boolean {
        return (
            this.selectedMapId() !== '' &&
            this.spotId().trim() !== '' &&
            this.spotNames().some(option => option.value === this.spotName()) &&
            this.positionImage() !== null &&
            this.crosshairImage() !== null
        );
    }

    protected async onSubmit(): Promise<void> {
        if (!this.isFormValid) return;

        this.isSubmitting.set(true);

        try {
            const posBase64 = await this.fileToBase64(this.positionImage()!.file);
            const crossBase64 = await this.fileToBase64(this.crosshairImage()!.file);

            const payload = {
                spot_id: this.spotId().trim(),
                spot_name: this.spotName(),
                map_name: this.selectedMapId(),
                throw_type: this.selectedThrowType(),
                player_position_image: posBase64,
                aim_position_image: crossBase64
            };

            this.utilityService.createUtility(payload).subscribe({
                next: () => {
                    this.isSubmitting.set(false);
                    this.submitted.set(true);
                    setTimeout(() => {
                        this.router.navigate(['/']);
                    }, 2000);
                },
                error: (err) => {
                    console.error(err);
                    this.isSubmitting.set(false);
                    if (err.status === 401) {
                        void this.router.navigate(['/login'], { queryParams: { returnUrl: '/create-spot' } });
                    } else {
                        alert(err.error?.error ?? 'Erro ao salvar utilitária. Tente novamente.');
                    }
                }
            });
        } catch (e) {
            console.error(e);
            this.isSubmitting.set(false);
            alert('Erro ao processar imagens.');
        }
    }

    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    private revokePreview(preview: ImagePreview | null): void {
        if (preview) {
            URL.revokeObjectURL(preview.url);
        }
    }
}
