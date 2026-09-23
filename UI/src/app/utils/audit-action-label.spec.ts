import { auditActionLabel } from './audit-action-label';

describe('auditActionLabel', () => {
  it('splits a multi-word action name into a sentence', () => {
    expect(auditActionLabel('SalaryChanged')).toBe('Salary changed');
  });

  it('leaves a one-word action name as it is', () => {
    expect(auditActionLabel('Deactivated')).toBe('Deactivated');
  });
});
