import { TestBed } from '@angular/core/testing';
import { RouterStateSnapshot } from '@angular/router';
import { ConfirmDialogService } from './confirm-dialog.service';
import {
  HasUnsavedChanges,
  unsavedChangesGuard,
} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let confirm: ReturnType<typeof vi.fn>;

  const run = (dirty: boolean, nextUrl = '/customers') => {
    const component: HasUnsavedChanges = { hasUnsavedChanges: () => dirty };
    const nextState = { url: nextUrl } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(component, null as never, null as never, nextState),
    );
  };

  beforeEach(() => {
    confirm = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmDialogService, useValue: { confirm } }],
    });
  });

  it('lets the user leave without asking when nothing has changed', () => {
    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks first when there are unsaved changes, with labels that say what happens', async () => {
    await run(true);

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('unsaved changes'),
      {
        title: 'Discard changes?',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        variant: 'danger',
      },
    );
  });

  it('allows the navigation when the user chooses to discard', async () => {
    confirm.mockResolvedValue(true);

    expect(await run(true)).toBe(true);
  });

  it('blocks the navigation when the user chooses to keep editing', async () => {
    confirm.mockResolvedValue(false);

    expect(await run(true)).toBe(false);
  });

  it('never blocks the redirect to login after a session expiry', () => {
    expect(run(true, '/login?sessionExpired=true')).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
