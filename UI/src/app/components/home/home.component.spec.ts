import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  const setup = async (
    state: { loading?: boolean; error?: string | null } = {},
  ) => {
    const service = {
      customers: signal([]),
      loading: signal(state.loading ?? false),
      error: signal(state.error ?? null),
      totalItems: signal(42),
      bindCustomers: vi.fn(),
      activationLoading: signal(false),
      activationError: signal(null),
      exportLoading: signal(false),
      exportError: signal(null),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: CustomerService, useValue: service },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement)
      .querySelector('h1')!
      .textContent!.replace(/\s+/g, ' ')
      .trim();
  };

  it('shows the number of customers next to the title', async () => {
    expect(await setup()).toBe('Customers (42)');
  });

  it('leaves the count off while the list is loading', async () => {
    expect(await setup({ loading: true })).toBe('Customers');
  });

  it('leaves the count off when the list fails to load', async () => {
    expect(await setup({ error: 'Failed to load customers' })).toBe(
      'Customers',
    );
  });
});
