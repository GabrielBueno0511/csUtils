import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MAP_SPOTS_DATA } from '../../shared/data/map-spots.data';
import { AdminService } from '../../shared/services/admin.service';
import { SpotCatalogService, type SpotCatalogEntry } from '../../shared/services/spot-catalog.service';

@Component({
  selector: 'app-admin-spots',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-spots.html',
  styleUrl: './admin-spots.scss',
})
export class AdminSpotsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly catalog = inject(SpotCatalogService);
  protected readonly maps = Object.values(MAP_SPOTS_DATA).map(map => ({ id: map.mapId, name: map.mapName }));
  protected readonly spots = signal<SpotCatalogEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly selectedMapId = signal(this.maps[0]?.id ?? '');
  protected readonly editing = signal<SpotCatalogEntry | null>(null);
  protected readonly name = signal('');
  protected readonly image = signal<File | null>(null);
  protected readonly imagePreview = signal('');
  protected readonly removeImage = signal(false);

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.catalog.adminCatalog().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: spots => this.spots.set(spots),
      error: () => this.error.set('Não foi possível carregar os spots. Confira se a migração de spots foi aplicada no Supabase.'),
    });
  }

  protected startCreate(): void {
    this.editing.set(null);
    this.name.set('');
    this.image.set(null);
    this.imagePreview.set('');
    this.removeImage.set(false);
    this.error.set('');
    this.success.set('');
  }

  protected startEdit(spot: SpotCatalogEntry): void {
    this.editing.set(spot);
    this.selectedMapId.set(spot.mapId);
    this.name.set(spot.name);
    this.image.set(null);
    this.imagePreview.set(spot.image);
    this.removeImage.set(false);
    this.error.set('');
    this.success.set('');
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Use uma imagem PNG, JPEG ou WebP de até 5 MB.');
      input.value = '';
      return;
    }
    this.error.set('');
    this.image.set(file);
    this.imagePreview.set(URL.createObjectURL(file));
    this.removeImage.set(false);
  }

  protected clearImage(): void {
    this.image.set(null);
    this.imagePreview.set('');
    this.removeImage.set(true);
  }

  protected submit(): void {
    const name = this.name().trim();
    const editing = this.editing();
    const mapId = this.selectedMapId();
    if (!name || name.length > 80 || !mapId || this.saving()) return;
    const spotId = editing?.id ?? this.makeId(name);
    if (!editing && this.spots().some(spot => spot.mapId === mapId && spot.id === spotId)) {
      this.error.set('Já existe um spot com esse nome neste mapa.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.admin.saveSpot({ mapId, spotId, name, isCustom: editing?.isCustom ?? true,
      image: this.image(), removeImage: this.removeImage() }).pipe(
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: () => {
        this.success.set(editing ? 'Spot atualizado.' : 'Spot adicionado ao mapa.');
        this.image.set(null);
        this.removeImage.set(false);
        this.load();
        if (!editing) this.name.set('');
      },
      error: error => this.error.set(error.error?.error ?? 'Não foi possível salvar o spot. Verifique a conexão e tente novamente.'),
    });
  }

  private makeId(value: string): string {
    const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/g, '');
    return slug || `spot-${crypto.randomUUID().slice(0, 8)}`;
  }
}
