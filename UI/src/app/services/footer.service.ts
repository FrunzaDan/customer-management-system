import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FooterService {
  private readonly showFooterSignal = signal(true);
  readonly showFooter = this.showFooterSignal.asReadonly();

  hideFooter() {
    this.showFooterSignal.set(false);
  }

  displayFooter() {
    this.showFooterSignal.set(true);
  }
}
