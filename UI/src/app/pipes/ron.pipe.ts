import { formatNumber, registerLocaleData } from '@angular/common';
import localeRo from '@angular/common/locales/ro';
import { Pipe, PipeTransform } from '@angular/core';

registerLocaleData(localeRo);

/** Formats an amount the Romanian way (1.234,50 RON), whatever the app's LOCALE_ID. */
@Pipe({ name: 'ron' })
export class RonPipe implements PipeTransform {
  transform(value: number | null | undefined, digitsInfo = '1.2-2'): string {
    if (value === null || value === undefined) return '';
    return `${formatNumber(value, 'ro', digitsInfo)} RON`;
  }
}
