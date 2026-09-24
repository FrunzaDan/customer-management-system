import { CustomerStatus } from '../interfaces/customer';

// The one place a customer status code becomes its label: the customer list and
// the details page both render it.
export function customerStatusLabel(status: CustomerStatus): string {
  switch (status) {
    case CustomerStatus.Active:
      return 'Active';
    case CustomerStatus.Deactivated:
      return 'Deactivated';
    case CustomerStatus.Test:
      return 'Test';
    default:
      return 'Unknown';
  }
}
