import { Component, inject } from '@angular/core';
import { NavbarService } from '../../services/navbar.service';
import { SessionStorageService } from '../../services/session-storage.service';

import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.css'],
  imports: [RouterModule],
})
export class NavigationBarComponent {
  private readonly navbarService = inject(NavbarService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly router = inject(Router);

  readonly showNavbar = this.navbarService.showNavbar;

  logout(): void {
    this.sessionStorageService.removeSessionStorage();
    this.router.navigate(['login']);
  }
}
