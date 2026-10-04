import { Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiLoggerService } from '../../services/api-logger.service';
import { NotificationService } from '../../services/notification.service';
import { CustomerService } from '../../services/customer.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { IsoDate } from '../../interfaces/iso-date';
import { Product } from '../../interfaces/product';
import {
  chooseProductsToBuy,
  randomPurchaseTime,
} from '../../utils/random-purchases';
import { buildRandomCustomer } from '../../utils/random-customer';
import {
  CreateCustomerRequest,
  CustomerStatus,
} from '../../interfaces/customer';

const TEST_CUSTOMER_COUNT = 50;

const MAX_PURCHASE_ROUNDS = 3;

const ENROLLMENT_DATE_RANGE_START = new Date(2005, 0, 1);
const ENROLLMENT_DATE_RANGE_END = new Date(2025, 11, 1);

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
  imports: [],
})
export class AboutComponent {
  private readonly apiLoggerService = inject(ApiLoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly customerService = inject(CustomerService);
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
      let stock: Product[];
      try {
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

      const taken = new Set<string>();
      const customers = Array.from({ length: TEST_CUSTOMER_COUNT }, () =>
        this.buildRandomCustomer(taken),
      );

      let added = 0;
      let failed = 0;
      let purchases = 0;
      let withoutPurchases = 0;
      for (const customer of customers) {
        let customerId: string | null;
        try {
          const response = await firstValueFrom(
            this.customerService.createCustomerSilently(customer),
          );
          customerId = response.data;
        } catch {
          failed++;
          continue;
        }
        added++;

        const bought = customerId
          ? await this.buyRandomProducts(
              customerId,
              customer.enrollmentDate!,
              stock,
            )
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

  private async buyRandomProducts(
    customerId: string,
    enrolledOn: IsoDate,
    stock: Product[],
  ): Promise<number> {
    let bought = 0;
    for (let round = 0; round < MAX_PURCHASE_ROUNDS && bought === 0; round++) {
      const chosen = chooseProductsToBuy(stock);
      if (chosen.length === 0) break;

      for (const product of chosen) {
        try {
          await firstValueFrom(
            this.purchaseService.purchaseProductSilently(
              customerId,
              product.productId,
              randomPurchaseTime(enrolledOn),
            ),
          );
          product.quantityOnHand--;
          bought++;
        } catch {
          product.quantityOnHand = 0;
        }
      }
    }
    return bought;
  }

  private buildRandomCustomer(taken: Set<string>): CreateCustomerRequest {
    return {
      ...buildRandomCustomer(
        ENROLLMENT_DATE_RANGE_START,
        ENROLLMENT_DATE_RANGE_END,
        taken,
      ),
      status: CustomerStatus.Test,
    };
  }
}
