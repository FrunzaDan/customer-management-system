import { Component, inject, signal } from '@angular/core';
import { catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { ApiLoggerService } from '../../services/api-logger.service';
import { NotificationService } from '../../services/notification.service';
import { AddCustomerService } from '../../services/add-customer.service';
import {
  Customer,
  CustomerActivationStatus,
} from '../../interfaces/customer-response';

const TEST_CUSTOMER_COUNT = 50;

const FIRST_NAMES = [
  'Andrei',
  'Maria',
  'Ion',
  'Elena',
  'Mihai',
  'Ioana',
  'Cristian',
  'Ana',
  'Alexandru',
  'Gabriela',
  'Florin',
  'Andreea',
  'Radu',
  'Simona',
  'George',
  'Cristina',
  'Dan',
  'Diana',
  'Vasile',
  'Larisa',
  'Adrian',
  'Mihaela',
  'Bogdan',
  'Roxana',
  'Cătălin',
  'Monica',
  'Ștefan',
  'Alina',
  'Vlad',
  'Nicoleta',
  'Gabriel',
  'Laura',
  'Razvan',
  'Aurelia',
  'Dorin',
  'Camelia',
  'Eugen',
  'Loredana',
  'Sorin',
  'Rodica',
];

const LAST_NAMES = [
  'Popescu',
  'Ionescu',
  'Popa',
  'Radu',
  'Dumitru',
  'Stan',
  'Gheorghe',
  'Constantin',
  'Marin',
  'Stoica',
  'Matei',
  'Ciobanu',
  'Munteanu',
  'Rusu',
  'Barbu',
  'Florea',
  'Nistor',
  'Toma',
  'Oprea',
  'Cristea',
  'Preda',
  'Dobre',
  'Dima',
  'Sârbu',
  'Neagu',
  'Enache',
  'Bălan',
  'Diaconu',
  'Ilie',
  'Lupu',
  'Moldovan',
  'Dragomir',
  'Micu',
  'Nica',
  'Suciu',
  'Voinea',
  'Burlacu',
  'Manole',
  'Pavel',
  'Ungureanu',
];

const COUNTIES_TOWNS: ReadonlyArray<{ county: string; town: string }> = [
  { county: 'Cluj', town: 'Cluj-Napoca' },
  { county: 'Iasi', town: 'Iasi' },
  { county: 'Timis', town: 'Timisoara' },
  { county: 'Brasov', town: 'Brasov' },
  { county: 'Constanta', town: 'Constanta' },
  { county: 'Bihor', town: 'Oradea' },
  { county: 'Sibiu', town: 'Sibiu' },
  { county: 'Dolj', town: 'Craiova' },
  { county: 'Ilfov', town: 'Otopeni' },
  { county: 'Bucuresti', town: 'Bucuresti' },
  { county: 'Arad', town: 'Arad' },
  { county: 'Arges', town: 'Pitesti' },
  { county: 'Bacău', town: 'Bacău' },
  { county: 'Bistrița-Năsăud', town: 'Bistrița' },
  { county: 'Botoșani', town: 'Botoșani' },
  { county: 'Brăila', town: 'Brăila' },
  { county: 'Buzău', town: 'Buzău' },
  { county: 'Caraș-Severin', town: 'Reșița' },
  { county: 'Călărași', town: 'Călărași' },
  { county: 'Covasna', town: 'Sfântu Gheorghe' },
  { county: 'Dâmbovița', town: 'Târgoviște' },
  { county: 'Galați', town: 'Galați' },
  { county: 'Gorj', town: 'Târgu Jiu' },
  { county: 'Hunedoara', town: 'Deva' },
  { county: 'Maramureș', town: 'Baia Mare' },
  { county: 'Mureș', town: 'Târgu Mureș' },
  { county: 'Neamț', town: 'Piatra Neamț' },
  { county: 'Prahova', town: 'Ploiești' },
  { county: 'Suceava', town: 'Suceava' },
  { county: 'Vâlcea', town: 'Râmnicu Vâlcea' },
];

const STREETS = [
  'Strada Avram Iancu',
  'Strada Nicolae Bălcescu',
  'Strada 1 Decembrie 1918',
  'Strada Stefan cel Mare',
  'Strada George Coșbuc',
  'Strada Tudor Vladimirescu',
  'Strada Ion Creangă',
  'Strada George Enescu',
  'Strada Horea',
  'Strada Primăverii',
  'Strada Castanilor',
  'Strada Teilor',
  'Strada Stejarului',
  'Strada Livezii',
  'Strada Şcolii',
  'Strada Bisericii',
  'Strada Păcii',
  'Strada Field',
  'Strada Carpați',
  'Strada Crișan',
];

function pick<T>(values: ReadonlyArray<T>): T {
  return values[Math.floor(Math.random() * values.length)];
}

function randomDigits(length: number): string {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

function randomBirthdate(): string {
  const start = new Date(1950, 0, 1).getTime();
  const end = new Date(2005, 11, 31).getTime();
  const date = new Date(start + Math.random() * (end - start));
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  imports: [],
})
export class AboutComponent {
  private readonly apiLoggerService = inject(ApiLoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly addCustomerService = inject(AddCustomerService);

  readonly apiLoggingEnabled = this.apiLoggerService.enabled;
  readonly addingTestCustomers = signal(false);

  toggleApiLogging(): void {
    this.apiLoggerService.toggle();
    this.notificationService.show(
      `API call logging turned ${this.apiLoggingEnabled() ? 'on' : 'off'}.`,
    );
  }

  addTestCustomers(): void {
    if (this.addingTestCustomers()) {
      return;
    }
    this.addingTestCustomers.set(true);

    // An index-based suffix (rather than pure randomness) guarantees no
    // email/msisdn collisions within the batch itself, since both columns
    // carry a unique constraint at the database level.
    const customers = Array.from({ length: TEST_CUSTOMER_COUNT }, (_, index) =>
      this.buildRandomCustomer(index),
    );

    from(customers)
      .pipe(
        concatMap((customer) =>
          this.addCustomerService.addCustomerSilently(customer).pipe(
            map(() => true),
            catchError(() => of(false)),
          ),
        ),
        toArray(),
      )
      .subscribe((results) => {
        this.addingTestCustomers.set(false);
        const succeeded = results.filter(Boolean).length;
        const failed = results.length - succeeded;
        this.notificationService.show(
          failed === 0
            ? `Added ${succeeded} test customers.`
            : `Added ${succeeded} test customers (${failed} failed).`,
          failed === 0 ? 'success' : 'error',
        );
      });
  }

  private buildRandomCustomer(index: number): Customer {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const { county, town } = pick(COUNTIES_TOWNS);
    const suffix = index.toString().padStart(2, '0');

    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`,
      msisdn: `07${randomDigits(6)}${suffix}`,
      gender: Math.floor(Math.random() * 3),
      birthdate: randomBirthdate(),
      customerStatus: CustomerActivationStatus.Test,
      address: {
        country: 'Romania',
        county,
        town,
        street: pick(STREETS),
        number: (Math.floor(Math.random() * 150) + 1).toString(),
        zip: randomDigits(6),
      },
    } as Customer;
  }
}
