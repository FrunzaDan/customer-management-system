import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavbarService {
  private readonly showNavbarSignal = signal(true);
  readonly showNavbar = this.showNavbarSignal.asReadonly();

  hideNavbar() {
    this.showNavbarSignal.set(false);
  }

  displayNavbar() {
    this.showNavbarSignal.set(true);
  }
}
