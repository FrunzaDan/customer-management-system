# Angular Frontend

## What it is

The Angular 22 app under `src/UI/`. It is zoneless, uses standalone components and signals, and renders with SSR.

## Key files / paths

- `src/environments/environment.ts` — `apiUrl` (`https://localhost:7145`) plus the email, phone number and username regexes.
- `src/app/app.config.ts`, `app.routes.ts`, `app.ts` (the shell).
- `src/app/services/` — one service per API area, plus:
  - the auth pieces (`auth.guard`, `verify-token`, `auth-token.interceptor`, `auth-error.interceptor`, `session-storage`);
  - the shared helpers (`notification`, `confirm-dialog`, `api-logger`, `health`, `unsaved-changes.guard`).
- `src/app/components/` — one folder per page or widget.
- `src/app/interfaces/` — mirrors of the API's JSON.
- `src/app/utils/extract-error-message.ts`, `audit-action-label.ts`, `random-purchases.ts`, `chart-scale.ts` (chart axis math, shared with the Imalo and employee apps), `chart-stats.ts` and `chart-geometry.ts` (chart data and curve helpers, shared with the employee and Imalo apps).
- `src/app/pipes/ron.pipe.ts`, `src/styles.css`.

## How it works

### Config

- **Zoneless:** there's no `zone.js` and no zoneless provider; zoneless change detection is the Angular default.
- `app.config.ts` sets up:
  - `provideBrowserGlobalErrorListeners()`;
  - the router, with component input binding, in-memory scrolling (scroll to top, anchors), `canceledNavigationResolution: 'computed'` and view transitions (initial one skipped);
  - `AppTitleStrategy` as the `TitleStrategy`;
  - hydration with event replay and no incremental hydration;
  - `provideHttpClient(withFetch(), withInterceptors([apiLoggerInterceptor, authTokenInterceptor, authErrorInterceptor]))`.
- **Render modes** (`app.routes.server.ts`): the routes with an id (`customers/:customerId`, `customers/update/:customerId`, `products/:productId`) render on the server per request; every other route is prerendered.
- Every route is lazy (`loadComponent`) and has a `title`. `AppTitleStrategy` appends " · Customer Management System".

### Auth

- **Login:** `POST /access-token`. The token goes into `sessionStorage`, and the app navigates to `/customers`.
- **Adding the token:** `authTokenInterceptor` adds the bearer token only to requests whose URL starts with `apiUrl`.
- **Route guard:** `authGuard` calls `GET /verify-token` before every protected route. On failure it clears the session and goes to `/login?sessionExpired=true`.
- **Mid-page 401s:** `authErrorInterceptor` handles a `401` from any other call the same way. The guard and the interceptor are kept separate on purpose.
- **Logout:** clears the session explicitly before navigating.

### Routes

| Route | Component |
|---|---|
| `/login` | `user-login` |
| `/customers` (`/` redirects here) | `home` → `customer-list` |
| `/customers/:customerId` | `customer-details` (record, purchases, audit trail — latest 10, then "…" to show the rest) |
| `/create-customer`, `/customers/update/:customerId` | `create-customer`, `update-customer` |
| `/products`, `/products/:productId`, `/create-product` | `products`, `product-details`, `create-product` |
| `/charts` | `charts` |
| `/audit-log` | `global-audit-log` |
| `/about` | `about` (API-logging toggle, test-customer generator; `enrollmentDate` is random between 2005-01-01 and 2025-12-01) |
| `**` | `page-not-found` |

- Route params bind to signal inputs (`customerId = input<string>()`).

### Data loading

- **Every read is a resource:** `httpResource` in services, and `rxResource` where a page combines several Observables. `subscribe()` is only for one-off actions such as create, update, delete and export.
- **`CustomerService`:**
  - **List:** `loadCustomers(params)` sets a params signal, and `customersResource` refetches on each change. A newer request cancels the older one.
  - **While loading:** a `linkedSignal` keeps the last page on screen during a load and after a failed one.
  - **One customer:** `getCustomer(id)` returns an Observable. `customer-details` and `update-customer` each key an `rxResource` on the route id; the details page reloads it after a deactivate or reactivate.
  - **After a change:** an update, status change or delete is written straight into the loaded list, with no refetch.
- `GlobalAuditLogService`, `AuditLogService`, `PurchaseService` and `CustomerInsightsService` follow the same pattern.
- **`ProductService`** is shaped like the employee app's `OfficeService`: `loadProducts()` feeds an `httpResource`, while `fetchProducts()` and `getProductDetails(id)` are one-off Observables. `product-details` keys an `rxResource` on the route id.
- **Retries:** deactivate and reactivate retry only on status 0 or ≥500, with backoff. After a reactivate, the list re-reads that row from the server, because the restored status may be Test rather than Active.
- **Customer list:**
  - search (debounced 300 ms), sort and paging all happen on the server;
  - page size is 50;
  - bulk actions deactivate the active customers and delete the rest, one call each.
- **CSV export:** uses the list's current search and sort, requests a `blob` and downloads it client-side.
- **Health banner:** `HealthService` polls `/health` every 15 s, in the browser only. `App` shows an "API is not running" card when it fails.

### Charts (`/charts`)

- The charts are hand-built inline SVG/HTML, with no chart library. The pure transforms live in `charts/charts-data.ts` and the shared `utils/chart-stats.ts`, both with specs.
- **Data:** `CustomerInsightsService` loads `GET /insights` (one anonymous row per customer plus monthly sales) and the page does all grouping client-side. `loadInsights()` reloads on every visit, so newly generated test data shows up.
- **Layout:** a gradient "At a glance" band of `kpi-tile`s (numbers count up; the customers and revenue tiles have sparklines), then "Customer base" and "Sales and catalogue". Several cards end in a `.chart-insight` pill that states the takeaway (busiest year, largest age group, share of 6+ year customers, share of repeat buyers).
- **Customer base:** customers enrolled (monthly/yearly toggle, defaults to yearly), base growth (cumulative, doesn't subtract deleted customers), status and gender donuts, age groups, loyalty (years since `enrollmentDate`), top 8 counties, purchases per customer.
- **Sales and catalogue:** revenue over time (valued at each product's **current** price, since the price paid isn't stored), then the catalogue charts from `ProductService.products`: top 7 categories plus "Other"; stock health flags categories ≥85% sold.
- **Series:** monthly and yearly series fill empty periods with 0, so the axis keeps real spacing. Whole-number data gets whole-number gridlines.
- **Components** (`charts/`): `time-series-chart` (bars or a smooth area line; hover or arrow keys show a tooltip, announced through an `aria-live` region; `viewWidth` is 900 by default and 480 in half-width cards so text stays readable), `donut-chart` (hover a slice or legend row to read it in the centre), `kpi-tile`, `ranked-bar-chart` (`color` input), `stock-health-chart`.
- **Axis and labels:** the axis math comes from the shared `utils/chart-scale.ts`. Money labels are whole RON through the `ron` pipe (`ron.transform(value, '1.0-0')`), as in the Imalo charts.
- **Colour:** series use `--chartColor1..8` from `styles.css`; `--dangerColor1` marks flags. Donut legends always print the label, value and percentage, so colour is never the only cue. Don't give Bootstrap class names (`.tooltip`, `.popover`) to SVG parts: Bootstrap styles them globally (its `.tooltip` is `opacity: 0`), which is why the chart tooltip is `.chart-tooltip`.
- **Motion:** bars rise, lines draw, arcs sweep and numbers count up once on load; the hero background drifts slowly. All of it is CSS or `requestAnimationFrame`, and it is switched off under `prefers-reduced-motion`.

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
- Table alignment (all three apps): text columns left, counts and money right (`text-end`), actions right; only checkbox and status-badge columns are centered. Names, phone numbers and dates get `text-nowrap`, so rows stay one line when the table scrolls sideways.
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
- **Components:** use `fixture.componentRef.setInput(...)`. Logic-only specs use `TestBed.runInInjectionContext`; list and details pages also render rows and click the real buttons (sort, paging, row actions), so a miswired template fails a test.

## Gotchas / conventions

- The app is zoneless, so any state the template reads must be a signal.
- `linkedSignal` is lazy: it only remembers a page that something has read.
- `value()` throws while a resource is in error. Guard reads with `hasValue()`.
- SSR runs HTTP through Node's `fetch`, which has its own TLS trust. See [build-and-run](build-and-run.md).
- The shared files (`notification`, `confirm-dialog`, `api-logger`, `extract-error-message`, `ron.pipe`, `audit-action-label`) are identical in all three apps. Change them together. `utils/chart-scale.ts` (axis math: `niceMax`, `formatTick`) is identical in all three apps. All three apps also share, file for file, `utils/chart-stats.ts` (banding, month/year series, histogram, ranking), `utils/chart-geometry.ts` (monotone smooth curves), the chart components `time-series-chart`, `donut-chart`, `kpi-tile`, `ranked-bar-chart` and the `.ranked-*` rules in `styles.css`; the customer and employee apps also share `charts.component.css` and the `--chartColor1..8` values. Change them together.
