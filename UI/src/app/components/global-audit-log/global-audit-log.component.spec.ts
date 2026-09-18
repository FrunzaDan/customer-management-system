import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GlobalAuditLogEntry } from '../../interfaces/global-audit-log-entry';
import { GlobalAuditLogService } from '../../services/global-audit-log.service';
import { GlobalAuditLogComponent } from './global-audit-log.component';

describe('GlobalAuditLogComponent', () => {
  let component: GlobalAuditLogComponent;
  let loadAllAuditLog: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let totalItems: ReturnType<typeof signal<number>>;

  const buildEntry = (
    overrides: Partial<GlobalAuditLogEntry> = {},
  ): GlobalAuditLogEntry => ({
    auditId: 1,
    customerGuid: 'guid-1',
    customerFirstName: 'Dan',
    customerLastName: 'Frunza',
    merchantId: 'TestMerchantID',
    action: 'Created',
    details: '',
    actionDate: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    loadAllAuditLog = vi.fn();
    navigate = vi.fn();
    totalItems = signal(0);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: GlobalAuditLogService,
          useValue: {
            entriesSignal: signal([]),
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            totalItemsSignal: totalItems,
            loadAllAuditLog,
          },
        },
        { provide: Router, useValue: { navigate } },
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
      pageSize: 20,
    });
  });

  describe('goToPage', () => {
    it('clamps above the last page down to totalPages', () => {
      totalItems.set(45); // 45 items / 20 per page = 3 pages
      loadAllAuditLog.mockClear();

      component.goToPage(10);

      expect(component.currentPage()).toBe(3);
      expect(loadAllAuditLog).toHaveBeenCalledWith({
        pageNumber: 3,
        pageSize: 20,
      });
    });

    it('clamps below page 1 up to 1', () => {
      totalItems.set(45);
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
      const entry = buildEntry({
        customerFirstName: null,
        customerLastName: null,
      });

      expect(component.customerLabel(entry)).toBe(
        '(deleted customer guid-1)',
      );
    });
  });

  describe('navigateToCustomer', () => {
    it('navigates to customerDetails when the customer still exists', () => {
      component.navigateToCustomer(buildEntry());

      expect(navigate).toHaveBeenCalledWith(['/customerDetails'], {
        queryParams: { id: 'guid-1' },
      });
    });

    it('does nothing for a deleted customer', () => {
      component.navigateToCustomer(
        buildEntry({ customerFirstName: null, customerLastName: null }),
      );

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
