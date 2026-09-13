import { NgClass } from '@angular/common';
import {
  Component,
  effect,
  inject,
  Injector,
  OnInit,
  runInInjectionContext,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Customer } from '../../interfaces/customer-response';
import { GetCustomerService } from '../../../../src/app/services/get-customer.service';
import { environment } from '../../../environments/environment';
import { EditCustomerService } from '../../services/edit-customer.service';

type EditCustomerForm = FormGroup<{
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  msisdn: FormControl<string>;
  gender: FormControl<string>;
  birthdate: FormControl<string>;
  country: FormControl<string>;
  county: FormControl<string>;
  town: FormControl<string>;
  street: FormControl<string>;
  number: FormControl<string>;
  zip: FormControl<string>;
}>;

@Component({
  selector: 'app-edit-customer',
  templateUrl: './edit-customer.component.html',
  styleUrls: ['./edit-customer.component.css'],
  imports: [NgClass, ReactiveFormsModule, RouterLink],
})
export class EditCustomerComponent implements OnInit {
  form: EditCustomerForm;
  paramId: string = '';
  readonly submitted = signal(false);

  readonly customer;
  readonly isLoading;
  readonly errorMessage;

  // Distinct from isLoading/errorMessage above, which reflect fetching the
  // customer being edited — this tracks the save (PATCH) request itself.
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  private injector = inject(Injector);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private getCustomerService: GetCustomerService,
    private editCustomerService: EditCustomerService,
  ) {
    this.form = this.createForm();

    this.customer = this.getCustomerService.selectedCustomerSignal;
    this.isLoading = this.getCustomerService.loadingSignal;
    this.errorMessage = this.getCustomerService.errorSignal;

    // Create effect in constructor using injector
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const customerData = this.customer();
        if (customerData) {
          this.form.patchValue(
            {
              firstName: customerData.firstName,
              lastName: customerData.lastName,
              email: customerData.email,
              msisdn: customerData.msisdn,
              gender: customerData.gender?.toString() ?? '',
              birthdate: this.toDateInputValue(customerData.birthdate),
              country: customerData.address.country,
              county: customerData.address.county,
              town: customerData.address.town,
              street: customerData.address.street,
              number: customerData.address.number,
              zip: customerData.address.zip,
            },
            { emitEvent: false },
          );
        }
      });
    });
  }

  // <input type="date"> requires a strictly zero-padded "YYYY-MM-DD" value to
  // pre-fill correctly. Older records saved via the previous year/month/day
  // text-box form could store unpadded values (e.g. "2020-1-5"), so normalize
  // before patching the form.
  private toDateInputValue(birthdate: string): string {
    const [year, month, day] = birthdate.split('-');
    if (!year || !month || !day) return '';
    return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private createForm(): EditCustomerForm {
    return this.fb.nonNullable.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [
        '',
        [Validators.required, Validators.pattern(environment.EmailRegex)],
      ],
      msisdn: [
        '',
        [Validators.required, Validators.pattern(environment.PhoneRegex)],
      ],
      gender: ['', Validators.required],
      birthdate: ['', Validators.required],
      country: ['', Validators.required],
      county: ['', Validators.required],
      town: ['', Validators.required],
      street: ['', Validators.required],
      number: ['', Validators.required],
      zip: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.paramId = this.route.snapshot.queryParamMap.get('id') ?? '';
    if (this.paramId) {
      this.getCustomerService.getCustomer(this.paramId);
    }
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted.set(true);

    if (this.form.invalid || !this.customer()) {
      return;
    }

    const formValue = this.form.getRawValue();

    const updatedCustomer: Customer = {
      ...this.customer()!,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      msisdn: formValue.msisdn,
      gender: Number(formValue.gender),
      birthdate: formValue.birthdate,
      address: {
        country: formValue.country,
        county: formValue.county,
        town: formValue.town,
        street: formValue.street,
        number: formValue.number,
        zip: formValue.zip,
      },
    };

    this.saving.set(true);
    this.saveError.set(null);

    this.editCustomerService.editCustomer(updatedCustomer).subscribe({
      next: () => {
        this.router.navigate(['../customers'], { relativeTo: this.route });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(this.extractErrorMessage(error));
      },
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Could not reach the server. It may be offline, or your browser does not trust its security certificate.';
    }
    return (
      error.error?.responseMessage ??
      error.error?.message ??
      `Failed to save changes (${error.status}). Please try again.`
    );
  }
}
