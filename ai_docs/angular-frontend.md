# Angular Frontend

## What it is

The Angular 22 app under `UI/`. It is zoneless, uses standalone components and signals, and renders with SSR.

## Key files / paths

- `src/environments/environment.ts` — `apiUrl` (`https://localhost:7145`) plus the email, phone number and username regexes.
- `src/app/app.config.ts`, `app.routes.ts`, `app.ts` (the shell).
- `src/app/services/` — one service per API area, plus:
  - the auth pieces (`auth.guard`, `verify-token`, `auth-token.interceptor`, `auth-error.interceptor`, `session-storage`);
  - the shared helpers (`notification`, `confirm-dialog`, `api-logger`, `health`, `unsaved-changes.guard`).
- `src/app/components/` — one folder per page or widget.
- `src/app/interfaces/` — mirrors of the API's JSON.
- `src/app/utils/extract-error-message.ts`, `audit-action-label.ts`, `random-purchases.ts`, `chart-scale.ts` (chart axis math, shared with the Imalo app).
- `src/app/pipes/ron.pipe.ts`, `src/styles.css`.

## How it works

### Config

- `app.config.ts` sets up:
  - `provideZonelessChangeDetection()`;
  - the router, with component input binding, view transitions and `canceledNavigationResolution: 'computed'`;
  - hydration with event replay;
  - `provideHttpClient(withFetch(), withInterceptors([apiLoggerInterceptor, authTokenInterceptor, authErrorInterceptor]))`.
- Every route is lazy (`loadComponent`) and has a `title`. `AppTitleStrategy` appends " · Customer Management System".

### Auth

- **Login:** `POST /access-token`. The token goes into `sessionStorage`, and the app navigates to `/customers`.
- **Adding the token:** `authTokenInterceptor` adds the bearer token only to requests whose URL starts with `apiUrl`.
- **Route guard:** `authGuardFn` calls `GET /verify-token` before every protected route. On failure it clears the session and goes to `/login?sessionExpired=true`.
- **Mid-page 401s:** `authErrorInterceptor` handles a `401` from any other call the same way. The guard and the interceptor are kept separate on purpose.
- **Logout:** clears the session explicitly before navigating.

### Routes

| Route | Component |
|---|---|
| `/login` | `user-login` |
| `/customers` (`/` redirects here) | `home` → `customer-list` |
| `/customers/:customerId` | `customer-details` (record, purchases, audit trail) |
| `/create-customer`, `/customers/update/:customerId` | `create-customer`, `update-customer` |
| `/products`, `/products/:productId`, `/create-product` | `products`, `product-details`, `create-product` |
| `/charts` | `charts` |
| `/audit-log` | `global-audit-log` |
| `/about` | `about` (API-logging toggle, test-customer generator) |
| `**` | `page-not-found` |

- Route params bind to signal inputs (`customerId = input<string>()`).

### Data loading

- **Every read is a resource:** `httpResource` in services, and `rxResource` where a page combines several Observables. `subscribe()` is only for one-off actions such as create, update, delete and export.
- **`CustomerService`:**
  - **List:** `loadCustomers(params)` sets a params signal, and `customersResource` refetches on each change. A newer request cancels the older one.
  - **While loading:** a `linkedSignal` keeps the last page on screen during a load and after a failed one.
  - **One customer:** `getCustomer(id)` returns an Observable. `customer-details` and `update-customer` each key an `rxResource` on the route id; the details page reloads it after a deactivate or reactivate.
  - **After a change:** an update, status change or delete is written straight into the loaded list, with no refetch.
- `GlobalAuditLogService`, `AuditLogService`, `PurchaseService` and `MonthlyActivityService` follow the same pattern.
- **`ProductService`** is shaped like the employee app's `OfficeService`: `loadProducts()` feeds an `httpResource`, while `fetchProducts()` and `getProductDetails(id)` are one-off Observables. `product-details` keys an `rxResource` on the route id.
- **Retries:** deactivate and reactivate retry only on status 0 or ≥500, with backoff. After a reactivate, the list re-reads that row from the server, because the restored status may be Test rather than Active.
- **Customer list:**
  - search (debounced 300 ms), sort and paging all happen on the server;
  - page size is 50;
  - bulk actions deactivate the active customers and delete the rest, one call each.
- **CSV export:** uses the list's current search and sort, requests a `blob` and downloads it client-side.
- **Health banner:** `HealthService` polls `/health` every 15 s, in the browser only. `App` shows an "API is not running" card when it fails.

### Charts (`/charts`)

- The charts are hand-built inline SVG/HTML, with no chart library. The pure transforms live in `charts/charts-data.ts`, which has a spec.
- **Catalogue charts** use `ProductService.products`. They show the top 7 categories plus "Other"; stock health shows every category and flags those ≥85% sold.
- **Time-series charts** use `GET /monthly-activity`. The monthly/yearly toggle is computed client-side.
- **Cumulative growth** counts registrations and doesn't subtract deleted customers, so it isn't a count of current customers.
- **Axis and labels:** the axis math comes from the shared `utils/chart-scale.ts`. Money labels are whole RON through the `ron` pipe (`ron.transform(value, '1.0-0')`), as in the Imalo charts.
- Each chart uses one color (`--spectrumColor2`), plus `--dangerColor1` for flags. The palette has no colorblind-safe pair.

### Forms (Signal Forms)

- `form()`, `[formField]` and `[formRoot]` with `submission: { action, onInvalid }`. There's no `FormGroup` or `ngModel`.
- `customer-form-fields/customer-form.ts` holds the model, the schema and the mappers.
- `update-customer`'s model is a `linkedSignal` from the customer its `rxResource` loads.
- **Unsaved changes:** `unsavedChangesGuard` plus `beforeunload`. "Dirty" means the values differ from the baseline.
- **Birth date:** `<input type="date">`, whose value is `YYYY-MM-DD` both ways.

### Naming (same in all three apps)

- **Page state:** `loading` and `loadError` for the data the page itself loads. Actions get their own: `saveError`, `deleteError`, `loginError`.
- **Service verbs:** `loadX()` starts a resource the service holds and returns nothing. `getX()` and `fetchX()` return an Observable. Writes are `createX`, `updateX` and `deleteX`, plus `…Silently` variants.
- **Service fields:** private resources end in `Resource`, and the base URL field is `apiUrl`.
- **Lists:** `sortColumn` and `sortDirection` (`'asc' | 'desc'`), with `SORT_LABELS` for the table caption. Bulk selection uses `selectedXIds`, `isSelected`, `toggleSelection`, `allSelected`, `toggleSelectAll` and `bulkActionInProgress`.
- **Status labels:** `customerStatusLabel()` in `utils/customer-status-label.ts` is the only place a status code becomes text.
- **Page titles and buttons:** "Add customer" and "Edit customer"; the edit form's button is "Save changes".

### User feedback (same in all three apps)

- **Success:** a toast, fired by the service in `tap`. Bulk callers use the `…Silently` variants and show one summary toast.
- **Failed action:** an inline `role="alert"` next to the control, with text from `extractErrorMessage`, which reads Problem Details (`errors` → `detail` → `title`).
- **Failed page load:** an alert in place of the content.
- **Confirmations:** `ConfirmDialogService.confirm(...)`, never `window.confirm()`.
- **API logging:** `apiLoggerInterceptor` logs API calls to the console in the browser, with password and token redacted. It is on by default in dev mode and can be toggled on the About page.

### Styling and accessibility

- Bootstrap plus `styles.css` tokens (`--spectrumColor1..4`, `--dangerColor1`), and the Jost font.
- Shared classes: `.page`, `.page-header`, `.app-card`, `.table-themed`, `.sort-button`, `.loading-state`, `.empty-state`.
- Motion (same in all three apps; tokens `--duration-*` and `--ease-*`, rules in the Motion section of `styles.css`):
  - cards (`.app-card`) rise in on appearance; sibling cards follow a beat apart;
  - table body rows carry `animate.enter="row-enter"` and `[style.--row-index]="$index"`, so added rows fade in staggered and re-sorted rows keep still;
  - hovered rows, and rows marked `is-selected` for a bulk action, show an accent bar on their left edge;
  - table links grow slightly under the pointer and press in on click; sort buttons and checkboxes press in, and the sort arrow (one `▲`, turned by `.sort-indicator--desc`) pops in and flips;
  - loading placeholders fade in after 0.2 s, so a fast load never flashes one;
  - hover transforms sit in `@media (hover: hover)`, so a tap on a phone does not leave them stuck.
- Display formats: text is sentence case, money uses the `ron` pipe, dates use `longDate`, timestamps use `medium`.
- Accessibility (WCAG 2.2 AA):
  - one `<h1>` per page, focused after each navigation;
  - real links and buttons;
  - sort buttons inside `<th aria-sort>`;
  - `prefers-reduced-motion` is respected.

### Tests

- Vitest through `@angular/build:unit-test`, using the default `ng new` setup.
- **HTTP:** `HttpTestingController`. Resource specs call `TestBed.tick()` to send the request, then `await ApplicationRef.whenStable()` after `flush()`.
- **Components:** use `fixture.componentRef.setInput(...)`. Logic-only specs use `TestBed.runInInjectionContext`.

## Gotchas / conventions

- The app is zoneless, so any state the template reads must be a signal.
- `linkedSignal` is lazy: it only remembers a page that something has read.
- `value()` throws while a resource is in error. Guard reads with `hasValue()`.
- SSR runs HTTP through Node's `fetch`, which has its own TLS trust. See [build-and-run](build-and-run.md).
- The shared files (`notification`, `confirm-dialog`, `api-logger`, `extract-error-message`, `ron.pipe`, `audit-action-label`) are identical in all three apps. Change them together. `utils/chart-scale.ts` (axis math: `niceMax`, `formatTick`) is identical in the customer and Imalo apps; the employee app has no charts.
