import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent accessibility', () => {
  let service: ConfirmDialogService;
  let trigger: HTMLButtonElement;
  let root: HTMLElement;

  const settle = (fixture: ReturnType<typeof TestBed.createComponent>) => {
    fixture.detectChanges();
    fixture.detectChanges(); // second pass lets the viewChild-driven effects run
  };

  const open = (fixture: ReturnType<typeof TestBed.createComponent>) => {
    const answer = service.confirm('Delete this customer?');
    settle(fixture);
    return answer;
  };

  beforeEach(() => {
    service = TestBed.inject(ConfirmDialogService);
    trigger = document.createElement('button');
    trigger.textContent = 'Delete';
    document.body.appendChild(trigger);
    trigger.focus();
  });

  afterEach(() => trigger.remove());

  it('is a labelled, described, modal alertdialog', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    open(fixture);
    root = fixture.nativeElement;

    const dialog = root.querySelector('[role="alertdialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(
      root.querySelector('#' + dialog.getAttribute('aria-labelledby'))
        ?.textContent,
    ).toContain('Please confirm');
    expect(
      root.querySelector('#' + dialog.getAttribute('aria-describedby'))
        ?.textContent,
    ).toContain('Delete this customer?');
  });

  it('moves focus to the non-destructive Cancel button when it opens', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    open(fixture);

    expect(document.activeElement?.textContent?.trim()).toBe('Cancel');
  });

  it('closes on Escape, resolves false, and returns focus to the trigger', async () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    const answer = open(fixture);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    settle(fixture);

    expect(await answer).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab / Shift+Tab inside the dialog', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    open(fixture);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const [cancel, confirm] = buttons;
    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]');

    confirm.focus();
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(cancel); // wrapped forward

    dialog.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(confirm); // wrapped backward
  });

  it('uses the default title and Cancel / Confirm labels unless told otherwise', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    open(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h2')?.textContent).toContain('Please confirm');
    expect(
      Array.from(el.querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Cancel', 'Confirm']);
  });

  it('shows a custom title and button labels, still focusing the cancel-side button', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    service.confirm('You have unsaved changes.', {
      title: 'Discard changes?',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
    });
    settle(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h2')?.textContent).toContain('Discard changes?');
    expect(
      Array.from(el.querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(['Keep editing', 'Discard changes']);
    expect(document.activeElement?.textContent?.trim()).toBe('Keep editing');
  });
});
