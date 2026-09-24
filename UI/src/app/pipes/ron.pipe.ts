import { formatNumber } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

@Pipe({ name: 'ron' })
export class RonPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined, digitsInfo = '1.2-2'): string {
    if (value === null || value === undefined) return '';
    return `${formatNumber(value, this.locale, digitsInfo)} RON`;
  }
}
