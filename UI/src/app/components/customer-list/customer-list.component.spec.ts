import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { NotificationService } from '../../services/notification.service';
import { Customer, CustomerStatus } from '../../interfaces/customer';
import { CustomerListComponent } from './customer-list.component';

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let loadCustomers: ReturnType<typeof vi.fn>;
  let exportCustomers: ReturnType<typeof vi.fn>;
  let totalItems: ReturnType<typeof signal<number>>;
  let customers: ReturnType<typeof signal<Customer[]>>;
  let deleteCustomer: ReturnType<typeof vi.fn>;
  let deleteCustomerSilently: ReturnType<typeof vi.fn>;
  let deactivateCustomerSilently: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let notificationShow: ReturnType<typeof vi.fn>;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    customerId: 'customer-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    phoneNumber: '123456789',
    email: 'dan@example.com',
    gender: 1,
    status: CustomerStatus.Active,
    createdAt: '2026-01-01',
    lastInteractionAt: '2026-01-01',
    birthDate: '1990-01-01',
    address: {
      country: 'Romania',
      county: 'Cluj',
      city: 'Cluj-Napoca',
      postalCode: '400000',
      street: 'Main',
      streetNumber: '1',
    },
    ...overrides,
  });

  beforeEach(() => {
    loadCustomers = vi.fn();
    exportCustomers = vi.fn();
    totalItems = signal(0);
    customers = signal<Customer[]>([]);
    deleteCustomer = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    deleteCustomerSilently = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    deactivateCustomerSilently = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    confirm = vi.fn().mockResolvedValue(true);
    notificationShow = vi.fn();

    const customerServiceStub = {
      customers,
      loading: signal(false),
      error: signal<string | null>(null),
      totalItems: totalItems,
      pageNumber: signal(1),
      pageSize: signal(10),
      loadCustomers,
      activationLoading: signal(false),
      activationError: signal<string | null>(null),
      deactivateCustomerSilently,
      deleteCustomer,
      deleteCustomerSilently,
      exportLoading: signal(false),
      exportError: signal<string | null>(null),
      exportCustomers,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomerService, useValue: customerServiceStub },
        { provide: ConfirmDialogService, useValue: { confirm } },
        { provide: NotificationService, useValue: { show: notificationShow } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setSort', () => {
    it('toggles direction when clicking the already-active column, and resets to page 1', () => {
      totalItems.set(75);
      component.currentPage.set(3);
      loadCustomers.mockClear();

      component.setSort('name'); // 'name' is already the default sort column

      expect(component.sortColumn()).toBe('name');
      expect(component.sortDirection()).toBe('desc');
      expect(component.currentPage()).toBe(1);
      expect(loadCustomers).toHaveBeenCalledTimes(1);
      expect(loadCustomers).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: undefined,
        sortColumn: 'name',
        sortDirection: 'desc',
      });
    });

    it('switches column and resets direction to asc when clicking a different column', () => {
      component.setSort('email');

      expect(component.sortColumn()).toBe('email');
      expect(component.sortDirection()).toBe('asc');
      expect(loadCustomers).toHaveBeenLastCalledWith({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: undefined,
        sortColumn: 'email',
        sortDirection: 'asc',
      });
    });
  });

  describe('goToPage', () => {
    it('clamps above the last page down to totalPages', () => {
      totalItems.set(120); // 120 items / 50 per page = 3 pages
      loadCustomers.mockClear();

      component.goToPage(10);

      expect(component.currentPage()).toBe(3);
      expect(loadCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageNumber: 3 }),
      );
    });

    it('clamps below page 1 up to 1', () => {
      totalItems.set(75);
      component.currentPage.set(3);
      loadCustomers.mockClear();

      component.goToPage(0);

      expect(component.currentPage()).toBe(1);
      expect(loadCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageNumber: 1 }),
      );
    });

    it('does nothing when the target page equals the current page', () => {
      loadCustomers.mockClear();

      component.goToPage(1); // already on page 1, totalPages() is 1 with 0 items

      expect(loadCustomers).not.toHaveBeenCalled();
    });
  });

  describe('onSearchInput', () => {
    it('debounces so only the last call within the window triggers a fetch', () => {
      vi.useFakeTimers();

      component.onSearchInput('d');
      vi.advanceTimersByTime(100);
      component.onSearchInput('da');
      vi.advanceTimersByTime(100);
      component.onSearchInput('dan');

      expect(loadCustomers).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(loadCustomers).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(loadCustomers).toHaveBeenCalledTimes(1);
      expect(loadCustomers).toHaveBeenCalledWith({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: 'dan',
        sortColumn: 'name',
        sortDirection: 'asc',
      });
    });

    it('resets to page 1 once the debounced fetch fires', () => {
      vi.useFakeTimers();
      totalItems.set(75);
      component.currentPage.set(2);
      loadCustomers.mockClear();

      component.onSearchInput('dan');
      vi.advanceTimersByTime(300);

      expect(component.currentPage()).toBe(1);
    });
  });

  describe('exportCsv', () => {
    it('exports with the current search term (trimmed) and sort state', () => {
      component.searchTerm.set('  dan  ');
      component.setSort('email');

      component.exportCsv();

      expect(exportCustomers).toHaveBeenCalledWith({
        searchTerm: 'dan',
        sortColumn: 'email',
        sortDirection: 'asc',
      });
    });

    it('omits searchTerm when the search box is blank', () => {
      component.exportCsv();

      expect(exportCustomers).toHaveBeenCalledWith({
        searchTerm: undefined,
        sortColumn: 'name',
        sortDirection: 'asc',
      });
    });
  });

  describe('toggleSelection / toggleSelectAll', () => {
    it('adds a customerId to selectedCustomerIds when checked, and removes it when unchecked', () => {
      component.toggleSelection('customer-1', true);
      expect(component.isSelected('customer-1')).toBe(true);

      component.toggleSelection('customer-1', false);
      expect(component.isSelected('customer-1')).toBe(false);
    });

    it('allSelected is false when the page is empty', () => {
      customers.set([]);
      expect(component.allSelected()).toBe(false);
    });

    it('toggleSelectAll(true) selects every customer on the current page', () => {
      customers.set([
        buildCustomer({ customerId: 'g1' }),
        buildCustomer({ customerId: 'g2' }),
      ]);

      component.toggleSelectAll(true);

      expect(component.isSelected('g1')).toBe(true);
      expect(component.isSelected('g2')).toBe(true);
      expect(component.allSelected()).toBe(true);
    });

    it('toggleSelectAll(false) clears the selection for every customer on the current page', () => {
      customers.set([
        buildCustomer({ customerId: 'g1' }),
        buildCustomer({ customerId: 'g2' }),
      ]);
      component.toggleSelectAll(true);

      component.toggleSelectAll(false);

      expect(component.isSelected('g1')).toBe(false);
      expect(component.isSelected('g2')).toBe(false);
      expect(component.allSelected()).toBe(false);
    });
  });

  describe('deleteCustomer', () => {
    it('does nothing when the user cancels the confirmation', async () => {
      confirm.mockResolvedValue(false);

      await component.deleteCustomer('customer-1');

      expect(deleteCustomer).not.toHaveBeenCalled();
    });

    it('deletes the customer and refetches the current page on success', async () => {
      loadCustomers.mockClear();

      await component.deleteCustomer('customer-1');

      expect(deleteCustomer).toHaveBeenCalledWith('customer-1');
      expect(component.deleting()).toBe(false);
      expect(component.deleteError()).toBeNull();
      // removeCustomerLocally only drops the row locally; the component still
      // re-fetches so totalItems/page count don't go stale.
      expect(loadCustomers).toHaveBeenCalledTimes(1);
    });

    it('surfaces the error and stops loading when the delete request fails', async () => {
      deleteCustomer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                title: 'Error',
                detail: 'Customer must be deactivated first.',
              },
            }),
        ),
      );

      await component.deleteCustomer('customer-1');

      expect(component.deleting()).toBe(false);
      expect(component.deleteError()).toBe(
        'Customer must be deactivated first.',
      );
    });
  });

  describe('bulkDeleteSelected', () => {
    it('does nothing when no rows are selected', async () => {
      await component.bulkDeleteSelected();

      expect(confirm).not.toHaveBeenCalled();
    });

    it('does not call any API when the user cancels the confirmation', async () => {
      customers.set([buildCustomer({ customerId: 'g1' })]);
      component.toggleSelection('g1', true);
      confirm.mockResolvedValue(false);

      await component.bulkDeleteSelected();

      expect(deactivateCustomerSilently).not.toHaveBeenCalled();
      expect(deleteCustomerSilently).not.toHaveBeenCalled();
    });

    it('deactivates Active customers and deletes non-Active ones, then shows a success summary and refetches', async () => {
      customers.set([
        buildCustomer({
          customerId: 'active-1',
          status: CustomerStatus.Active,
        }),
        buildCustomer({
          customerId: 'deactivated-1',
          status: CustomerStatus.Deactivated,
        }),
        buildCustomer({ customerId: 'test-1', status: CustomerStatus.Test }),
      ]);
      component.toggleSelectAll(true);
      loadCustomers.mockClear();

      await component.bulkDeleteSelected();

      expect(confirm).toHaveBeenCalledWith(
        expect.stringContaining('1 is active'),
        expect.objectContaining({ confirmLabel: 'Apply', variant: 'danger' }),
      );
      expect(deactivateCustomerSilently).toHaveBeenCalledWith('active-1');
      expect(deleteCustomerSilently).toHaveBeenCalledWith('deactivated-1');
      expect(deleteCustomerSilently).toHaveBeenCalledWith('test-1');
      expect(notificationShow).toHaveBeenCalledWith(
        'Bulk action completed: 1 deactivated, 2 deleted.',
        'success',
      );
      expect(component.bulkActionInProgress()).toBe(false);
      expect(loadCustomers).toHaveBeenCalledTimes(1);
    });

    it('reports a failure count and does not stop the batch when one operation fails', async () => {
      customers.set([
        buildCustomer({
          customerId: 'active-1',
          status: CustomerStatus.Active,
        }),
        buildCustomer({
          customerId: 'deactivated-1',
          status: CustomerStatus.Deactivated,
        }),
      ]);
      component.toggleSelectAll(true);
      deactivateCustomerSilently.mockReturnValue(
        throwError(() => new Error('boom')),
      );

      await component.bulkDeleteSelected();

      expect(deleteCustomerSilently).toHaveBeenCalledWith('deactivated-1');
      expect(notificationShow).toHaveBeenCalledWith(
        'Bulk action completed with 1 failure(s) (1 succeeded).',
        'error',
      );
    });
  });
});
