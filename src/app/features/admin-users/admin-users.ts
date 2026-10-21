import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../shared/services/admin.service';
import type { AdminUser } from '../../shared/models/admin-user.interface';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly admin = inject(AdminService);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly savingId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly adminCount = computed(() => this.users().filter(user => user.role === 'admin').length);
  protected readonly spotCount = computed(() => this.users().reduce((sum, user) => sum + Number(user.spots_created), 0));

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.admin.users().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: () => { this.error.set('Não foi possível carregar os usuários. Confira sua conexão e tente novamente.'); this.loading.set(false); },
    });
  }

  protected changeRole(user: AdminUser, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as 'admin' | 'user';
    if (role === user.role || this.savingId()) return;
    this.savingId.set(user.id);
    this.error.set('');
    this.admin.setRole(user.id, role).subscribe({
      next: () => {
        this.users.update(users => users.map(item => item.id === user.id ? { ...item, role } : item));
        this.savingId.set(null);
      },
      error: () => {
        this.error.set('Não foi possível alterar o papel. O sistema precisa manter pelo menos um administrador.');
        this.savingId.set(null);
      },
    });
  }

  protected metadata(user: AdminUser): string {
    const metadata = user.user_metadata ?? {};
    return Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : 'Sem dados adicionais';
  }
}
