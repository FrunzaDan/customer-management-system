import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { GlobalAuditLogEntry } from '../../interfaces/global-audit-log-entry';
import { GlobalAuditLogService } from '../../services/global-audit-log.service';
import { GlobalAuditLogComponent } from './global-audit-log.component';

describe('GlobalAuditLogComponent', () => {
  let component: GlobalAuditLogComponent;
  let loadAllAuditLog: ReturnType<typeof vi.fn>;
  let deleteAllAuditLog: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let totalItems: ReturnType<typeof signal<number>>;

  const buildEntry = (
    overrides: Partial<GlobalAuditLogEntry> = {},
  ): GlobalAuditLogEntry => ({
    customerAuditLogId: 1,
    customerId: 'customer-1',
    customerFirstName: 'Dan',
    customerLastName: 'Frunza',
    performedBy: 'TestMerchantID',
    actionType: 'Created',
    details: '',
    occurredAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    loadAllAuditLog = vi.fn();
    deleteAllAuditLog = vi.fn();
    confirm = vi.fn();
    totalItems = signal(0);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: GlobalAuditLogService,
          useValue: {
            entries: signal([]),
            loading: signal(false),
            error: signal<string | null>(null),
            totalItems: totalItems,
            loadAllAuditLog,
            deleteAllAuditLog,
          },
        },
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new GlobalAuditLogComponent(),
    );
  });

  it('fetches page 1 on init', () => {
    component.ngOnInit();

    expect(loadAllAuditLog).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 50,
    });
  });

  describe('goToPage', () => {
    it('clamps above the last page down to totalPages', () => {
      totalItems.set(120); // 120 items / 50 per page = 3 pages
      loadAllAuditLog.mockClear();

      component.goToPage(10);

      expect(component.currentPage()).toBe(3);
      expect(loadAllAuditLog).toHaveBeenCalledWith({
        pageNumber: 3,
        pageSize: 50,
      });
    });

    it('clamps below page 1 up to 1', () => {
      totalItems.set(120);
      component.currentPage.set(3);
      loadAllAuditLog.mockClear();

      component.goToPage(0);

      expect(component.currentPage()).toBe(1);
    });

    it('does nothing when the target page equals the current page', () => {
      loadAllAuditLog.mockClear();

      component.goToPage(1);

      expect(loadAllAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('customerLabel', () => {
    it('joins first and last name when the customer still exists', () => {
      expect(component.customerLabel(buildEntry())).toBe('Dan Frunza');
    });

    it('labels a deleted customer by GUID instead of a blank name', () => {
      // The API sends a deleted customer's name as null.
      const entry = buildEntry({
        customerFirstName: null,
        customerLastName: null,
      });

      expect(component.customerLabel(entry)).toBe(
        '(deleted customer customer-1)',
      );
    });
  });

  describe('clearAuditLog', () => {
    it('deletes the log once confirmed and goes back to page 1', async () => {
      confirm.mockResolvedValue(true);
      deleteAllAuditLog.mockReturnValue(of({}));
      component.currentPage.set(3);

      await component.clearAuditLog();

      expect(confirm).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ confirmLabel: 'Delete', variant: 'danger' }),
      );
      expect(deleteAllAuditLog).toHaveBeenCalled();
      expect(component.currentPage()).toBe(1);
      expect(component.clearing()).toBe(false);
      expect(component.clearError()).toBeNull();
    });

    it('does nothing when the confirmation is cancelled', async () => {
      confirm.mockResolvedValue(false);

      await component.clearAuditLog();

      expect(deleteAllAuditLog).not.toHaveBeenCalled();
    });

    it('shows a failed clear inline', async () => {
      confirm.mockResolvedValue(true);
      deleteAllAuditLog.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );

      await component.clearAuditLog();

      expect(component.clearing()).toBe(false);
      expect(component.clearError()).toBe(
        'Failed to clear the audit log (500). Please try again.',
      );
    });
  });
});
