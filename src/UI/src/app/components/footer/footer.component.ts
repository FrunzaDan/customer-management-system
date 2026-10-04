import { Component, inject } from '@angular/core';
import { FooterService } from '../../services/footer.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  imports: [],
})
export class FooterComponent {
  private readonly footerService = inject(FooterService);
  readonly showFooter = this.footerService.showFooter;
  readonly year = new Date().getFullYear();
}
