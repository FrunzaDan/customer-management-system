import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavbarService {
  private readonly visible = signal(true);
  readonly showNavbar = this.visible.asReadonly();

  hideNavbar() {
    this.visible.set(false);
  }

  displayNavbar() {
    this.visible.set(true);
  }
}
