import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  users() {
    return defer(() => this.supabase.adminUsers());
  }

  setRole(userId: string, role: 'admin' | 'user') {
    return defer(() => this.supabase.setAdminUserRole(userId, role));
  }

  saveSpot(input: { mapId: string; spotId: string; name: string; isCustom: boolean; image: File | null; removeImage: boolean }) {
    return defer(() => this.supabase.saveAdminSpot(input));
  }
}
