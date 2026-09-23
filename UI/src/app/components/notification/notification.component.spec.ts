import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../../services/notification.service';
import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  const render = () => {
    const fixture = TestBed.createComponent(NotificationComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('announces a success politely and an error assertively', () => {
    const service = TestBed.inject(NotificationService);
    service.show('Saved');
    service.show('Failed', 'error');
    const fixture = render();

    const toasts = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.notification-toast',
      ),
    );
    expect(toasts.map((t) => t.getAttribute('role'))).toEqual([
      'status',
      'alert',
    ]);
    expect(toasts[1].classList).toContain('notification-error');
  });

  it('removes a toast when its close button is clicked', () => {
    TestBed.inject(NotificationService).show('Failed', 'error');
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelector<HTMLButtonElement>(
      'button[aria-label="Dismiss notification"]',
    )!.click();
    fixture.detectChanges();

    expect(el.querySelector('.notification-toast')).toBeNull();
  });
});
