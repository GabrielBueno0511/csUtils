import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, map, timeout } from 'rxjs';

import { SupabaseService } from './supabase.service';

export interface UtilityDto {
    id?: number;
    author_id?: number | string | null;
    author_name?: string | null;
    pixel_name: string;
    utility_type: 'smoke' | 'molotov' | 'flashbang' | 'he';
    map_name: string;
    throw_type: string;
    player_position_image: string;
    aim_position_image: string;
}

export function normalizeLegacyUtility(row: UtilityDto & { spot_id?: string; spot_name?: string }): UtilityDto {
    const allowed = ['smoke', 'molotov', 'flashbang', 'he'];
    return {
        ...row,
        pixel_name: row.pixel_name ?? row.spot_id ?? '',
        utility_type: allowed.includes(row.utility_type ?? '') ? row.utility_type! :
            allowed.includes(row.spot_name ?? '') ? row.spot_name as UtilityDto['utility_type'] : 'smoke',
    };
}

@Injectable({
    providedIn: 'root'
})
export class UtilityService {
    private readonly apiUrl = '/api/utilities';
    private readonly http = inject(HttpClient);
    private readonly supabase = inject(SupabaseService);

    public createUtility(utility: UtilityDto): Observable<UtilityDto> {
        if (this.supabase.enabled) return defer(() => this.supabase.createUtility(utility));
        return this.http.post<UtilityDto>(`${this.apiUrl}/`, {
            ...utility, spot_id: utility.pixel_name, spot_name: utility.utility_type,
        }).pipe(map(normalizeLegacyUtility));
    }

    public deleteUtility(id: string): Observable<void> {
        if (this.supabase.enabled) return defer(() => this.supabase.deleteUtility(id));
        return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(id)}`, { body: {} }).pipe(timeout(15000));
    }

    public getUtilitiesByMap(mapName: string): Observable<UtilityDto[]> {
        if (this.supabase.enabled) return defer(() => this.supabase.utilities(mapName));
        return this.http.get<UtilityDto[]>(`${this.apiUrl}/map/${mapName}`).pipe(map(rows => rows.map(normalizeLegacyUtility)));
    }
}
