import { Injectable, inject } from '@angular/core';
import { defer, map, of } from 'rxjs';
import { MAP_SPOTS_DATA } from '../data/map-spots.data';
import type { MapSpotsData, SpotItem } from '../models/spot-item.interface';
import { SupabaseService, type AdminSpotRecord } from './supabase.service';

export interface SpotCatalogEntry extends SpotItem {
  readonly mapId: string;
  readonly mapName: string;
  readonly isCustom: boolean;
}

@Injectable({ providedIn: 'root' })
export class SpotCatalogService {
  private readonly supabase = inject(SupabaseService);

  forMap(mapId: string) {
    const mapData = MAP_SPOTS_DATA[mapId];
    if (!mapData) return of([] as SpotItem[]);
    return this.records().pipe(map(records => this.mergeMap(mapData, records)));
  }

  adminCatalog() {
    return this.records().pipe(map(records => {
      return Object.values(MAP_SPOTS_DATA).flatMap(mapData =>
        this.mergeMap(mapData, records).map(spot => ({
          ...spot,
          mapId: mapData.mapId,
          mapName: mapData.mapName,
          isCustom: records.find(row => row.map_id === mapData.mapId && row.spot_id === spot.id)?.is_custom ?? false,
        } satisfies SpotCatalogEntry)));
    }));
  }

  private records() {
    return this.supabase.enabled ? defer(() => this.supabase.adminSpots()) : of([] as AdminSpotRecord[]);
  }

  private mergeMap(map: MapSpotsData, records: AdminSpotRecord[]): SpotItem[] {
    const rows = records.filter(row => row.map_id === map.mapId);
    const byId = new Map(rows.map(row => [row.spot_id, row]));
    const staticIds = new Set(map.spots.map(spot => spot.id));
    const builtIns = map.spots.map(spot => {
      const override = byId.get(spot.id);
      return override ? this.applyOverride(spot, override) : spot;
    });
    const custom = rows.filter(row => row.is_custom && !staticIds.has(row.spot_id)).map(row => ({
      id: row.spot_id,
      name: row.name,
      image: row.image_cleared ? '' : row.image_url,
      imageLabel: row.name,
      imageNeedsConfirmation: row.image_cleared || !row.image_path,
      description: `${row.name} na ${map.mapName}`,
    }));
    return [...builtIns, ...custom];
  }

  private applyOverride(spot: SpotItem, row: AdminSpotRecord): SpotItem {
    const image = row.image_cleared ? '' : row.image_path ? row.image_url : spot.image;
    return {
      ...spot,
      name: row.name,
      image,
      imageNeedsConfirmation: row.image_cleared || (!row.image_path && spot.imageNeedsConfirmation),
      imageLabel: image ? (row.image_path ? row.name : spot.imageLabel) : '',
      description: row.name === spot.name ? spot.description : `${row.name} (posição do mapa)`,
    };
  }
}
