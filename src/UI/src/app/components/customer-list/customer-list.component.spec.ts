import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { NotificationService } from '../../services/notification.service';
import { Customer, CustomerStatus } from '../../interfaces/customer';
import { CustomerListComponent } from './customer-list.component';

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let bindCustomers: ReturnType<typeof vi.fn>;
  let reloadCustomers: ReturnType<typeof vi.fn>;
  let exportCustomers: ReturnType<typeof vi.fn>;
  let totalItems: ReturnType<typeof signal<number>>;
  let customers: ReturnType<typeof signal<Customer[]>>;
  let deleteCustomer: ReturnType<typeof vi.fn>;
  let deleteCustomerSilently: ReturnType<typeof vi.fn>;
  let deactivateCustomerSilently: ReturnType<typeof vi.fn>;
  let deactivateCustomer: ReturnType<typeof vi.fn>;
  let reactivateCustomer: ReturnType<typeof vi.fn>;
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
    enrollmentDate: '2015-06-01',
    accountCreatedAt: '2026-01-01',
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
    bindCustomers = vi.fn();
    reloadCustomers = vi.fn();
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
    deactivateCustomer = vi.fn().mockResolvedValue(undefined);
    reactivateCustomer = vi.fn().mockResolvedValue(undefined);
    confirm = vi.fn().mockResolvedValue(true);
    notificationShow = vi.fn();

    const customerServiceStub = {
      customers,
      loading: signal(false),
      error: signal<string | null>(null),
      totalItems: totalItems,
      pageNumber: signal(1),
      pageSize: signal(10),
      bindCustomers,
      reloadCustomers,
      activationLoading: signal(false),
      activationError: signal<string | null>(null),
      deactivateCustomerSilently,
      deactivateCustomer,
      reactivateCustomer,
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
        provideRouter([]),
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new CustomerListComponent(),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds the list to its params, starting on page 1 sorted by name', () => {
    expect(bindCustomers).toHaveBeenCalledWith(component.listParams);
    expect(component.listParams()).toEqual({
      pageNumber: 1,
      pageSize: 50,
      searchTerm: undefined,
      sortColumn: 'name',
      sortDirection: 'asc',
    });
  });

  describe('setSort', () => {
    it('toggles direction when clicking the already-active column, and resets to page 1', () => {
      totalItems.set(75);
      component.currentPage.set(2);

      component.setSort('name');

      expect(component.sortColumn()).toBe('name');
      expect(component.sortDirection()).toBe('desc');
      expect(component.listParams()).toEqual({
        pageNumber: 1,
        pageSize: 50,
        searchTerm: undefined,
        sortColumn: 'name',
        sortDirection: 'desc',
      });
    });

    it('switches column and resets direction to asc when clicking a different column', () => {
      component.setSort('name');

      component.setSort('email');

      expect(component.sortColumn()).toBe('email');
      expect(component.sortDirection()).toBe('asc');
      expect(component.listParams()).toEqual(
        expect.objectContaining({ sortColumn: 'email', sortDirection: 'asc' }),
      );
    });
  });

  describe('goToPage', () => {
    it('clamps above the last page down to totalPages', () => {
      totalItems.set(120);

      component.goToPage(10);

      expect(component.currentPage()).toBe(3);
      expect(component.listParams().pageNumber).toBe(3);
    });

    it('clamps below page 1 up to 1', () => {
      totalItems.set(75);
      component.currentPage.set(2);

      component.goToPage(0);

      expect(component.currentPage()).toBe(1);
      expect(component.listParams().pageNumber).toBe(1);
    });

    it('keeps the same params when the target page equals the current page', () => {
      const before = component.listParams();

      component.goToPage(1);

      expect(component.listParams()).toBe(before);
    });
  });

  describe('search', () => {
    it('searches by the trimmed term and goes back to page 1', () => {
      totalItems.set(75);
      component.currentPage.set(2);

      component.searchForm.term().value.set('  dan  ');

      expect(component.listParams()).toEqual(
        expect.objectContaining({ pageNumber: 1, searchTerm: 'dan' }),
      );
    });

    it('leaves searchTerm out of the params when the box is blank', () => {
      component.searchForm.term().value.set('   ');

      expect(component.listParams().searchTerm).toBeUndefined();
    });

    it('waits for typing to pause before searching', async () => {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(CustomerListComponent);
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'input[type="search"]',
      );

      input.value = 'dan';
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(299);
      expect(fixture.componentInstance.listParams().searchTerm).toBeUndefined();

      await vi.advanceTimersByTimeAsync(1);
      expect(fixture.componentInstance.listParams().searchTerm).toBe('dan');
    });

    it('clears the selection when the search changes', () => {
      component.toggleSelection('customer-1', true);

      component.searchForm.term().value.set('dan');

      expect(component.isSelected('customer-1')).toBe(false);
    });
  });

  describe('exportCsv', () => {
    it('exports with the current search term (trimmed) and sort state', () => {
      component.searchForm.term().value.set('  dan  ');
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

    it('deletes the customer and reloads the current page on success', async () => {
      customers.set([buildCustomer()]);

      await component.deleteCustomer('customer-1');

      expect(deleteCustomer).toHaveBeenCalledWith('customer-1');
      expect(component.deleting()).toBe(false);
      expect(component.deleteError()).toBeNull();
      expect(reloadCustomers).toHaveBeenCalledTimes(1);
    });

    it('steps back a page instead when the delete empties the current one', async () => {
      totalItems.set(51);
      component.currentPage.set(2);
      customers.set([]);

      await component.deleteCustomer('customer-1');

      expect(component.currentPage()).toBe(1);
      expect(reloadCustomers).not.toHaveBeenCalled();
    });

    it('reloads page 1 when the delete empties it, since there is no page to step back to', async () => {
      customers.set([]);

      await component.deleteCustomer('customer-1');

      expect(component.currentPage()).toBe(1);
      expect(reloadCustomers).toHaveBeenCalledTimes(1);
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

    it('deactivates Active customers and deletes non-Active ones, then shows a success summary and reloads', async () => {
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
      expect(reloadCustomers).toHaveBeenCalledTimes(1);
      expect(component.selectedCustomerIds().size).toBe(0);
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

  describe('template', () => {
    let fixture: ComponentFixture<CustomerListComponent>;

    const el = <T extends HTMLElement>(selector: string): T =>
      fixture.nativeElement.querySelector(selector);
    const button = (label: string): HTMLButtonElement =>
      el(`button[aria-label="${label}"]`);
    const buttonByText = (text: string): HTMLButtonElement =>
      Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((b) => b.textContent?.trim().startsWith(text))!;
    const settle = () => new Promise((resolve) => setTimeout(resolve));

    beforeEach(async () => {
      customers.set([
        buildCustomer({
          customerId: 'active-1',
          firstName: 'Ana',
          lastName: 'Pop',
          email: 'ana@example.com',
          status: CustomerStatus.Active,
        }),
        buildCustomer({
          customerId: 'deactivated-1',
          firstName: 'Ion',
          lastName: 'Rus',
          email: 'ion@example.com',
          status: CustomerStatus.Deactivated,
        }),
      ]);
      totalItems.set(120);
      fixture = TestBed.createComponent(CustomerListComponent);
      await fixture.whenStable();
    });

    it('renders one row per customer with name, email and status', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');

      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Ana Pop');
      expect(rows[0].textContent).toContain('ana@example.com');
      expect(rows[1].textContent).toContain('Ion Rus');
    });

    it('offers Deactivate only on active rows and Reactivate/Delete only on deactivated rows', () => {
      expect(button('Deactivate Ana Pop')).not.toBeNull();
      expect(button('Delete Ana Pop')).toBeNull();
      expect(button('Reactivate Ana Pop')).toBeNull();

      expect(button('Deactivate Ion Rus')).toBeNull();
      expect(button('Reactivate Ion Rus')).not.toBeNull();
      expect(button('Delete Ion Rus')).not.toBeNull();
    });

    it("deletes that row's customer when its Delete button is clicked", async () => {
      button('Delete Ion Rus').click();
      await settle();

      expect(deleteCustomer).toHaveBeenCalledWith('deactivated-1');
      expect(deactivateCustomer).not.toHaveBeenCalled();
    });

    it("deactivates that row's customer when its Deactivate button is clicked", async () => {
      button('Deactivate Ana Pop').click();
      await settle();

      expect(deactivateCustomer).toHaveBeenCalledWith('active-1');
      expect(deleteCustomer).not.toHaveBeenCalled();
    });

    it("reactivates that row's customer when its Reactivate button is clicked", async () => {
      button('Reactivate Ion Rus').click();
      await settle();

      expect(reactivateCustomer).toHaveBeenCalledWith('deactivated-1');
    });

    it.each([
      ['Name', 'name'],
      ['Email', 'email'],
      ['Phone number', 'phoneNumber'],
    ])(
      'sorts by the column whose header "%s" is clicked',
      async (text, column) => {
        buttonByText(text).click();
        await fixture.whenStable();

        expect(fixture.componentInstance.sortColumn()).toBe(column);
        expect(
          el(
            `th[aria-sort="${column === 'name' ? 'descending' : 'ascending'}"]`,
          ).textContent,
        ).toContain(text);
      },
    );

    it('moves forward and back through pages with Next and Previous', async () => {
      expect(buttonByText('Previous').disabled).toBe(true);
      expect(el('nav').textContent).toContain('Page 1 of 3');

      buttonByText('Next').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.listParams().pageNumber).toBe(2);
      expect(el('nav').textContent).toContain('Page 2 of 3');

      buttonByText('Previous').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.listParams().pageNumber).toBe(1);
    });

    it('disables Next on the last page', async () => {
      fixture.componentInstance.goToPage(3);
      await fixture.whenStable();

      expect(buttonByText('Next').disabled).toBe(true);
    });

    it('selects rows through the checkboxes and bulk-deletes the selection', async () => {
      const bulk = buttonByText('Bulk delete selected');
      expect(bulk.disabled).toBe(true);

      el<HTMLInputElement>('input[aria-label="Select Ion Rus"]').click();
      await fixture.whenStable();
      expect(bulk.textContent).toContain('(1)');

      el<HTMLInputElement>(
        'input[aria-label="Select all customers on this page"]',
      ).click();
      await fixture.whenStable();
      expect(bulk.textContent).toContain('(2)');

      bulk.click();
      await settle();
      expect(deactivateCustomerSilently).toHaveBeenCalledWith('active-1');
      expect(deleteCustomerSilently).toHaveBeenCalledWith('deactivated-1');
    });

    it('exports through the Export CSV button', () => {
      buttonByText('Export CSV').click();

      expect(exportCustomers).toHaveBeenCalledTimes(1);
    });
  });
});
