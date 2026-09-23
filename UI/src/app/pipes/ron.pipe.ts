import { formatNumber } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

// "15.00 RON". Angular's built-in currency pipe renders RON with no space
// between the code and the number ("RON15.00") because the en-US locale has
// no symbol for it, which reads as cramped next to the surrounding text.
@Pipe({ name: 'ron' })
export class RonPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return `${formatNumber(value, this.locale, '1.2-2')} RON`;
  }
}
