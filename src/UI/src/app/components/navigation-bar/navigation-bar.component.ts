import { Component, inject, signal } from '@angular/core';
import { NavbarService } from '../../services/navbar.service';
import { SessionStorageService } from '../../services/session-storage.service';

import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrl: './navigation-bar.component.css',
  imports: [RouterModule],
})
export class NavigationBarComponent {
  private readonly navbarService = inject(NavbarService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly router = inject(Router);

  readonly showNavbar = this.navbarService.showNavbar;

  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.sessionStorageService.removeSessionStorage();
    this.router.navigate(['login']);
  }
}
