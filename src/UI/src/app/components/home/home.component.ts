import { Component, viewChild } from '@angular/core';
import { CustomerListComponent } from '../customer-list/customer-list.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [CustomerListComponent],
})
export class HomeComponent {
  readonly customerList = viewChild(CustomerListComponent);
}
