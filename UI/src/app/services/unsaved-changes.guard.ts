import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from './confirm-dialog.service';

// Implemented by pages with a form (create-customer, update-customer).
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

// Asks before leaving a page with unsaved edits — covers Cancel, the nav links,
// browser back/forward and Log out. (Closing/reloading the tab isn't a router
// navigation; the components handle that with a `beforeunload` listener.)
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component,
  _currentRoute,
  _currentState,
  nextState,
) => {
  if (!component.hasUnsavedChanges()) return true;

  // An expired session is redirected to /login by the guard/interceptor; blocking
  // that would leave the user stuck on a form they can no longer save.
  if (nextState?.url.includes('sessionExpired=true')) return true;

  return inject(ConfirmDialogService).confirm(
    'You have unsaved changes. If you leave this page they will be lost.',
    {
      title: 'Discard changes?',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      variant: 'danger',
    },
  );
};
