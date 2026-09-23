import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FooterService {
  private readonly visible = signal(true);
  readonly showFooter = this.visible.asReadonly();

  hideFooter() {
    this.visible.set(false);
  }

  displayFooter() {
    this.visible.set(true);
  }
}
