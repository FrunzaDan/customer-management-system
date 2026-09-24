import {
  Component,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, of, skip } from 'rxjs';
import { environment } from '../environments/environment';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { NotificationComponent } from './components/notification/notification.component';
import { HealthService } from './services/health.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [
    ConfirmDialogComponent,
    FooterComponent,
    NavigationBarComponent,
    NotificationComponent,
    RouterOutlet,
  ],
})
export class App {
  protected readonly environment = environment;

  private readonly healthService = inject(HealthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  readonly apiAvailable = toSignal(
    isPlatformBrowser(this.platformId)
      ? this.healthService.pollApiHealth()
      : of(true),
    { initialValue: true },
  );

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(
          filter((event) => event instanceof NavigationEnd),
          skip(1),
          takeUntilDestroyed(),
        )
        .subscribe(() =>
          afterNextRender(() => this.focusPageHeading(), {
            injector: this.injector,
          }),
        );
    }
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  private focusPageHeading(): void {
    const main = this.main().nativeElement;
    const target = main.querySelector<HTMLElement>('h1') ?? main;
    target.setAttribute('tabindex', '-1');
    target.focus();
  }
}
