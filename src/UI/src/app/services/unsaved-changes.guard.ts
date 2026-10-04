import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from './confirm-dialog.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (
  component,
  _currentRoute,
  _currentState,
  nextState,
) => {
  if (!component.hasUnsavedChanges()) return true;

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
