import { TestBed } from '@angular/core/testing';
import { TimeSeriesChartComponent } from './time-series-chart.component';

describe('TimeSeriesChartComponent', () => {
  const points = [
    { key: '2024', label: '2024', value: 2 },
    { key: '2025', label: '2025', value: 5 },
    { key: '2026', label: '2026', value: 3 },
  ];

  const create = () => {
    const fixture = TestBed.createComponent(TimeSeriesChartComponent);
    fixture.componentRef.setInput('points', points);
    fixture.detectChanges();
    return fixture;
  };

  const key = (name: string) => new KeyboardEvent('keydown', { key: name });

  it('labels only the peak bar until something is hovered', () => {
    const component = create().componentInstance;

    expect(component.marks().map((m) => m.isPeak)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('uses whole-number gridlines for whole-number data', () => {
    const component = create().componentInstance;

    expect(component.gridLines().map((g) => g.label)).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('starts keyboard reading at the latest value and moves with the arrows', () => {
    const component = create().componentInstance;

    component.onFocus();
    expect(component.activeDescription()).toBe('2026: 3');

    component.onKeydown(key('ArrowLeft'));
    component.onKeydown(key('ArrowLeft'));
    component.onKeydown(key('ArrowLeft'));
    expect(component.activeDescription()).toBe('2024: 2');

    component.onKeydown(key('End'));
    expect(component.activeIndex()).toBe(2);
  });

  it('shows a tooltip for the active point and hides it on leave', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.setActive(1);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.chart-tooltip').textContent,
    ).toContain('2025');

    component.setActive(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chart-tooltip')).toBeNull();
  });
});
