import { TestBed } from '@angular/core/testing';
import { KpiTileComponent } from './kpi-tile.component';

describe('KpiTileComponent', () => {
  const create = (value: number | null, trend: number[] = []) => {
    const fixture = TestBed.createComponent(KpiTileComponent);
    fixture.componentRef.setInput('label', 'Customers');
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('trend', trend);
    fixture.detectChanges();
    return fixture;
  };

  it('always exposes the final formatted value to screen readers', () => {
    const fixture = create(1234);

    expect(
      fixture.nativeElement.querySelector('.visually-hidden').textContent,
    ).toContain('1,234');
  });

  it('shows a dash when there is no value', () => {
    const fixture = create(null);

    expect(fixture.componentInstance.finalValue()).toBe('—');
  });

  it('draws a sparkline only when there are at least two trend points', () => {
    expect(create(5, [1]).nativeElement.querySelector('.kpi-spark')).toBeNull();
    expect(
      create(5, [1, 4, 9]).nativeElement.querySelector('.kpi-spark'),
    ).not.toBeNull();
  });
});
