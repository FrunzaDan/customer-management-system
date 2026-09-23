import { emptyCustomerForm, isCustomerFormDirty } from './customer-form';

describe('isCustomerFormDirty', () => {
  it('is false when nothing differs from the baseline', () => {
    expect(isCustomerFormDirty(emptyCustomerForm(), emptyCustomerForm())).toBe(false);
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
