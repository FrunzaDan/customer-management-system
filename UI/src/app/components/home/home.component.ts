import { Component } from '@angular/core';
import { CustomerListComponent } from '../customer-list/customer-list.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [CustomerListComponent],
})
export class HomeComponent {}
