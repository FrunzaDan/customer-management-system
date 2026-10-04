import { CustomerStatus } from '../interfaces/customer';

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
