import { emptyCustomerForm, isCustomerFormDirty } from './customer-form';
import { environment } from '../../../environments/environment';

describe('isCustomerFormDirty', () => {
  it('is false when nothing differs from the baseline', () => {
    expect(isCustomerFormDirty(emptyCustomerForm(), emptyCustomerForm())).toBe(
      false,
    );
  });

  it('is true when any single field differs', () => {
    const changed = { ...emptyCustomerForm(), postalCode: '400000' };

    expect(isCustomerFormDirty(changed, emptyCustomerForm())).toBe(true);
  });

  it('is false again once a changed value is put back', () => {
    const baseline = { ...emptyCustomerForm(), firstName: 'Dan' };
    const edited = { ...baseline, firstName: 'Daniel' };
    const reverted = { ...edited, firstName: 'Dan' };

    expect(isCustomerFormDirty(edited, baseline)).toBe(true);
    expect(isCustomerFormDirty(reverted, baseline)).toBe(false);
  });
});

describe('environment.emailRegex', () => {
  const emailRegex = new RegExp(environment.emailRegex);

  it('accepts a plain address', () => {
    expect(emailRegex.test('ana.pop@example.com')).toBe(true);
  });

  it.each(['a@b@c.com', 'ana pop@example.com', 'ana@example', '@example.com'])(
    'rejects %s',
    (email) => {
      expect(emailRegex.test(email)).toBe(false);
    },
  );
});
