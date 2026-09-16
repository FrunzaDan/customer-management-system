import { Component, PLATFORM_ID, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { NotificationComponent } from './components/notification/notification.component';
import { RouterOutlet } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { HealthService } from './services/health.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [
    ConfirmDialogComponent,
    FooterComponent,
    NavigationBarComponent,
    NotificationComponent,
    RouterOutlet,
  ],
})
export class App {
  title = 'customer_management_system';
  environment = environment;

  private readonly healthService = inject(HealthService);
  private readonly platformId = inject(PLATFORM_ID);

  // Repeated polling only makes sense in the browser — during SSR/prerendering
  // it would keep the zone permanently "unstable", which hangs the build's
  // prerender step waiting for a stability signal that never arrives.
  readonly apiAvailable = toSignal(
    isPlatformBrowser(this.platformId)
      ? this.healthService.pollApiHealth()
      : of(true),
    { initialValue: true },
  );
}
