import { TestBed } from '@angular/core/testing';
import { DonutChartComponent } from './donut-chart.component';

describe('DonutChartComponent', () => {
  const create = (slices: { label: string; value: number }[]) => {
    const fixture = TestBed.createComponent(DonutChartComponent);
    fixture.componentRef.setInput('slices', slices);
    fixture.componentRef.setInput('centerCaption', 'customers');
    fixture.detectChanges();
    return fixture;
  };

  it('shows each slice with its share, and the total in the centre', () => {
    const fixture = create([
      { label: 'Active', value: 3 },
      { label: 'Test', value: 1 },
    ]);
    const component = fixture.componentInstance;

    expect(component.arcs().map((a) => a.percentText)).toEqual(['75%', '25%']);
    expect(component.center()).toEqual({ value: '4', caption: 'customers' });
    expect(fixture.nativeElement.querySelectorAll('circle.arc')).toHaveLength(
      2,
    );
  });

  it('shows the hovered slice in the centre', () => {
    const component = create([
      { label: 'Active', value: 3 },
      { label: 'Test', value: 1 },
    ]).componentInstance;

    component.setActive(1);

    expect(component.center()).toEqual({ value: '25%', caption: 'Test' });
  });

  it('draws no arc for an empty slice but keeps it in the legend', () => {
    const fixture = create([
      { label: 'Active', value: 2 },
      { label: 'Deactivated', value: 0 },
    ]);

    expect(fixture.nativeElement.querySelectorAll('circle.arc')).toHaveLength(
      1,
    );
    expect(fixture.nativeElement.querySelectorAll('.legend-item')).toHaveLength(
      2,
    );
  });

  it('shows the empty message when every slice is zero', () => {
    const fixture = create([{ label: 'Active', value: 0 }]);

    expect(fixture.nativeElement.textContent).toContain('No data yet.');
  });
});
