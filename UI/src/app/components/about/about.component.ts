import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiLoggerService } from '../../services/api-logger.service';
import { NotificationService } from '../../services/notification.service';
import { CreateCustomerService } from '../../services/create-customer.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import { chooseProductsToBuy } from '../../utils/random-purchases';
import {
  CreateCustomerRequest,
  CustomerStatus,
  Gender,
} from '../../interfaces/customer-response';

const TEST_CUSTOMER_COUNT = 50;

// How many times to re-draw products for a customer whose every purchase was rejected
// (e.g. the products it picked ran out of stock) before giving up on it.
const MAX_PURCHASE_ROUNDS = 3;

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

const COUNTIES_CITIES: ReadonlyArray<{ county: string; city: string }> = [
  { county: 'Cluj', city: 'Cluj-Napoca' },
  { county: 'Iasi', city: 'Iasi' },
  { county: 'Timis', city: 'Timisoara' },
  { county: 'Brasov', city: 'Brasov' },
  { county: 'Constanta', city: 'Constanta' },
  { county: 'Bihor', city: 'Oradea' },
  { county: 'Sibiu', city: 'Sibiu' },
  { county: 'Dolj', city: 'Craiova' },
  { county: 'Ilfov', city: 'Otopeni' },
  { county: 'Bucuresti', city: 'Bucuresti' },
  { county: 'Arad', city: 'Arad' },
  { county: 'Arges', city: 'Pitesti' },
  { county: 'Bacău', city: 'Bacău' },
  { county: 'Bistrița-Năsăud', city: 'Bistrița' },
  { county: 'Botoșani', city: 'Botoșani' },
  { county: 'Brăila', city: 'Brăila' },
  { county: 'Buzău', city: 'Buzău' },
  { county: 'Caraș-Severin', city: 'Reșița' },
  { county: 'Călărași', city: 'Călărași' },
  { county: 'Covasna', city: 'Sfântu Gheorghe' },
  { county: 'Dâmbovița', city: 'Târgoviște' },
  { county: 'Galați', city: 'Galați' },
  { county: 'Gorj', city: 'Târgu Jiu' },
  { county: 'Hunedoara', city: 'Deva' },
  { county: 'Maramureș', city: 'Baia Mare' },
  { county: 'Mureș', city: 'Târgu Mureș' },
  { county: 'Neamț', city: 'Piatra Neamț' },
  { county: 'Prahova', city: 'Ploiești' },
  { county: 'Suceava', city: 'Suceava' },
  { county: 'Vâlcea', city: 'Râmnicu Vâlcea' },
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

function randomBirthDate(): string {
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
  styleUrl: './about.component.css',
  imports: [],
})
export class AboutComponent {
  private readonly apiLoggerService = inject(ApiLoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly createCustomerService = inject(CreateCustomerService);
  private readonly productService = inject(ProductService);
  private readonly purchaseService = inject(PurchaseService);

  readonly apiLoggingEnabled = this.apiLoggerService.enabled;
  readonly addingTestCustomers = signal(false);

  toggleApiLogging(): void {
    this.apiLoggerService.toggle();
    this.notificationService.show(
      `API call logging turned ${this.apiLoggingEnabled() ? 'on' : 'off'}.`,
    );
  }

  async createTestCustomers(): Promise<void> {
    if (this.addingTestCustomers()) {
      return;
    }
    this.addingTestCustomers.set(true);

    try {
      // Fetched before anything is created: if the catalogue can't be loaded, fail up
      // front rather than leaving 50 customers that were meant to have purchases without.
      let stock: Product[];
      try {
        // A private copy, decremented as the run buys — so it stops offering products it
        // has drained, without re-fetching the catalogue after every purchase.
        stock = (await firstValueFrom(this.productService.fetchProducts())).map(
          (product) => ({ ...product }),
        );
      } catch {
        this.notificationService.show(
          'Could not load the product catalogue, so no test customers were added.',
          'error',
        );
        return;
      }

      // An index-based suffix (rather than pure randomness) guarantees no
      // email/phoneNumber collisions within the batch itself, since both columns
      // carry a unique constraint at the database level.
      const customers = Array.from(
        { length: TEST_CUSTOMER_COUNT },
        (_, index) => this.buildRandomCustomer(index),
      );

      // Sequential on purpose (as the bulk delete is): each purchase reads and decrements
      // shared stock, and one HTTP call at a time keeps the API and the tally in step.
      let added = 0;
      let failed = 0;
      let purchases = 0;
      let withoutPurchases = 0;
      for (const customer of customers) {
        let customerId: string | undefined;
        try {
          const response = await firstValueFrom(
            this.createCustomerService.createCustomerSilently(customer),
          );
          customerId = response.data;
        } catch {
          failed++;
          continue;
        }
        added++;

        const bought = customerId
          ? await this.buyRandomProducts(customerId, stock)
          : 0;
        purchases += bought;
        if (bought === 0) withoutPurchases++;
      }

      const problems = [
        failed > 0 ? `${failed} failed` : null,
        withoutPurchases > 0
          ? `${withoutPurchases} could not buy anything — products are out of stock`
          : null,
      ].filter((problem) => problem !== null);
      this.notificationService.show(
        `Added ${added} test customers with ${purchases} purchases` +
          (problems.length > 0 ? ` (${problems.join('; ')}).` : '.'),
        problems.length > 0 ? 'error' : 'success',
      );
    } finally {
      this.addingTestCustomers.set(false);
    }
  }

  /**
   * Gives a freshly registered test customer (by the GUID registration returned) 1–5
   * distinct in-stock products and returns how many purchases went through.
   */
  private async buyRandomProducts(
    customerId: string,
    stock: Product[],
  ): Promise<number> {
    let bought = 0;
    for (let round = 0; round < MAX_PURCHASE_ROUNDS && bought === 0; round++) {
      const chosen = chooseProductsToBuy(stock);
      if (chosen.length === 0) break; // nothing left in stock

      for (const product of chosen) {
        try {
          await firstValueFrom(
            this.purchaseService.purchaseProductSilently(
              customerId,
              product.productId,
            ),
          );
          product.quantityOnHand--;
          bought++;
        } catch {
          // Rejected (typically out of stock): don't offer it again this run.
          product.quantityOnHand = 0;
        }
      }
    }
    return bought;
  }

  private buildRandomCustomer(index: number): CreateCustomerRequest {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const { county, city } = pick(COUNTIES_CITIES);
    const suffix = index.toString().padStart(2, '0');

    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`,
      phoneNumber: `07${randomDigits(6)}${suffix}`,
      gender: pick([Gender.NotDeclared, Gender.Male, Gender.Female]),
      birthDate: randomBirthDate(),
      status: CustomerStatus.Test,
      address: {
        country: 'Romania',
        county,
        city,
        street: pick(STREETS),
        streetNumber: (Math.floor(Math.random() * 150) + 1).toString(),
        postalCode: randomDigits(6),
      },
    };
  }
}
