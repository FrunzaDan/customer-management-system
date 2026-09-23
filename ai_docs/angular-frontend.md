# Angular Frontend

## What it is

Global HTTP/router wiring, the auth guard, the login flow, the route/component map, and the services layer — everything under `UI`.

## Key files / paths

- `UI/src/environments/environment.ts`
- `UI/src/app/app.config.ts`, `app.routes.ts`
- `UI/src/app/services/auth-guard.service.ts`, `verify-token.service.ts`, `auth-error.interceptor.ts`
- `UI/src/app/components/user-login/user-login.component.ts`
- `UI/src/app/services/user-login.service.ts`, `session-storage.service.ts`
- `UI/src/app/components/*`
- `UI/src/app/services/*`

## How it works

### App config, routing & the auth guard

**Config** (`environment.ts`):
```ts
export const environment = {
  apiUrl: 'https://localhost:7145',
  emailRegex: "^\\S+@\\S+\\.\\S+$",
  phoneNumberRegex: "^[0-9]{9,12}$",
  usernameRegex: "^[a-zA-Z0-9 ]*$"
};
```
Every service builds its request URL off `apiUrl`.

**`app.config.ts`** wires up: Router (component input binding, view transitions, scroll restoration), **SSR client hydration** (`provideClientHydration(withEventReplay(), withNoIncrementalHydration())`), `HttpClient` on the **fetch-based backend** (`provideHttpClient(withFetch(), withInterceptors([apiLoggerInterceptor, authErrorInterceptor]))` — the fetch-based backend matters for SSR: during server-side rendering, HTTP calls run through Node's native `fetch()`, not a browser's, see [build-and-run](build-and-run.md) for the TLS implication of that), and **`provideZonelessChangeDetection()`** — there's no `zone.js` in this app at all; see Components/state below for what that means.

**Routing & the auth guard** (`app.routes.ts`, `auth-guard.service.ts`): all routes except `/login` and the catch-all 404 carry `canActivate: [authGuardFn]`. The guard:
1. Calls `VerifyTokenService.isTokenValid()`, which hits `GET /api/authentication/verify-token` with whatever token is in session storage.
2. `200` → allow navigation. Anything else (401, network error, TLS error) → clear session storage, redirect to `/login?sessionExpired=true`.

Because routes are guarded and the app uses SSR, this guard's HTTP call can run inside **Node** (server-side) as well as in the browser (client-side, post-hydration).

**Global 401 handling** (`auth-error.interceptor.ts`): a functional `HttpInterceptorFn` (`authErrorInterceptor`) catches any 401 from any API call — except calls to `/api/authentication/*`, which manage their own 401/403 semantics — clears session storage, and redirects to `/login?sessionExpired=true`. This exists so an expired token discovered mid-session (not just at navigation time, when the guard checks) is handled uniformly, without every component needing its own 401 branch.

- `verify-token.service.ts`'s `isTokenValid()` is deliberately a simple `pipe(map(() => true), catchError(() => of(false)))`. An earlier version used a manually-managed RxJS `Subject` that crashed (`Cannot read properties of null`) whenever the API returned a 401 with an empty body, orphaning the guard's subscription and cascading into hydration timeouts and an unclickable login form. **Don't reintroduce a manual `Subject` here.**
- The guard and the interceptor are two separate 401-handling paths by design (navigation-time vs. any-time-during-a-page) — don't collapse them into one without checking both are still exercised (route guards don't run for API calls made without a navigation, e.g. a button click on a page you're already on).

### Login flow

1. User submits username + password → `UserLoginService.checkCredentials()` → `POST /api/authentication/access-token`, returning a `CredentialsCheckResult { success, message }` discriminated result (checked via `response.status === 200`, not by string-matching the body).
2. On success: the token is stashed via `SessionStorageService` (`sessionStorage`, cleared when the tab closes), the app navigates to `/customers`.
3. On error, `UserLoginComponent` maps the HTTP status to a message:
   - `403` → "Merchant credentials are incorrect!"
   - `404` → "Endpoint is down!"
   - `429` → rate-limit message (see [api](api.md) for the `"login"` policy backing this)
   - `0` (no response reached the browser at all — network/TLS-level failure) → "Could not reach the server. It may be offline, or your browser does not trust its security certificate."
   - anything else → `"Server error ({statusCode}). Please try again later."`

- `status === 0` is a **deliberately distinct** case: it's what a rejected TLS certificate (e.g. `ERR_CERT_AUTHORITY_INVALID`) looks like to Angular's `HttpClient` — no response body, no real status code — so the message says so instead of defaulting to a generic "server is down," which would be misleading (the server is up; the browser just doesn't trust its cert). See [build-and-run](build-and-run.md) for the underlying dev-cert trust issue this message is covering for.
- The token is attached to the login *request itself* too (via `HttpHeaderService`) even though there's nothing to authenticate yet at that point — harmless (an empty/garbage `Authorization` header on an anonymous endpoint), just worth knowing it's not conditional on having a token already.

### Route/component map

| Component | Route | Purpose |
|---|---|---|
| `user-login` | `/login` | Merchant sign-in form |
| `home` | `/`, `/customers` | Customer list landing page (just a heading + `app-customer-list`; the "Register customer" button lives in the customer-list toolbar, not here) |
| `customer-list` | (used by `home`) | Table of customers, `@for` track-by GUID; server-side search, sort, and pagination |
| `customer-details` | `/customer-details` | Single customer's full record (friendly status), a Purchases card (record a purchase + history) and its audit trail |
| `products` | `/products` | Product catalogue table: price, sold, inventory, left ("Sold out" badge); name links to the product page |
| `product-details` | `/product-details` | One product: Sold/Inventory/Left, product info, and which customers bought it and when |
| `charts` | `/charts` | Charts tab — catalogue charts (units sold/best-sellers/stock health/revenue by category) plus time-series charts (customers joined, cumulative growth, products sold). See [charts](charts.md) |
| `global-audit-log` | `/audit-log` | Paginated audit trail across every customer, newest first |
| `add-customer` | `/add-customer` | Create-customer form |
| `edit-customer` | `/edit-customer` | Edit-customer form |
| `about` | `/about` | Static about/docs page, plus dev tools (API-call logging toggle; generate 50 test customers, each with 1–5 purchases — see [products-and-purchases](products-and-purchases.md)) |
| `navigation-bar` | (shown/hidden via `NavbarService`) | Top nav — hidden on `/login`; owns the "Log out" action |
| `footer` | (shown/hidden via `FooterService`) | Page footer — hidden on `/login` |
| `display-error` | n/a | Reusable error display |
| `page-not-found` | `**` | 404 fallback |

Gender is stored/sent as an **integer**: `0` = Not declared, `1` = Male, `2` = Female — canonicalized across `add-customer` and `edit-customer` forms (both use **Signal Forms** — see "Forms" below; the `<select>` emits string values, converted with `Number(model.gender) as Gender` in `toCreateCustomerRequest()` (`customer-form-fields/customer-form.ts`) to match `Customer.gender: Gender`, a numeric enum in `interfaces/customer-response.ts`).

### Forms (Signal Forms)

`add-customer`, `edit-customer` and `user-login` use `@angular/forms/signals` (`form()`, `[formField]`, `<form [formRoot]>`) — **no** `FormBuilder`/`FormGroup`/`ReactiveFormsModule`/`NgClass` anywhere.

- **Model + schema live in code, markup is shared.** `components/customer-form-fields/customer-form.ts` holds `CustomerFormModel`, `customerFormSchema` (all `required`/`pattern` rules and their messages), and the mappers `toFormModel()` / `toCreateCustomerRequest()` (add) / `applyFormModel()` (edit: the loaded customer with the form's values applied). `CustomerFormFieldsComponent` renders the two cards for both pages via a signal `input.required<FieldTree<CustomerFormModel>>()`.
- **Submission** is the form's own `submission: { action, onInvalid }` option, triggered by `[formRoot]`. `action` is an async method (`firstValueFrom(service call)`, then `router.navigate(['/customers'])`); the button uses `customerForm().submitting()` — there is no hand-rolled `loading`/`submitted` signal. `onInvalid` sets a summary alert and moves focus to the first bad field via `errorSummary()[0].fieldTree().focusBoundControl()`.
- **Errors show once a field is touched** (`state.touched() && state.invalid()`), and every error `<div class="invalid-feedback">` has an `id` referenced by the input's `aria-describedby`, plus `aria-invalid`.
- **`edit-customer`'s model is a `linkedSignal`** derived from `GetCustomerService.selectedCustomerSignal` (`toFormModel(customer)`), so it re-derives when the customer loads/changes yet stays writable for edits — this replaced the old `effect()` + `patchValue`. Saving merges the model onto the loaded customer (`toCustomer(model, current)`) so server-owned fields (guid, status, dates) are preserved.
- **`user-login`** also reads `?sessionExpired=true` (set by `AuthGuardService` and `authErrorInterceptor`) through `readonly sessionExpired = input<string>()` and shows a `role="status"` "Your session has expired" notice — without it users bounced by an expired token get no explanation. The submit button is never disabled for an invalid form (that hides *why* from keyboard/AT users); submitting shows the errors and focuses the first bad field. Inputs carry `autocomplete="username"` / `"current-password"`.

### Route params

`withComponentInputBinding()` (in `app.config.ts`) binds `?id=` straight to `readonly id = input<string>()` on `customer-details` and `edit-customer`; a constructor `effect()` (with the load call in `untracked`) fetches when it changes. Don't reintroduce `ActivatedRoute` subscriptions/snapshots there.

### Unsaved-changes protection (add / edit customer)

Leaving a form with unsaved edits asks first, at three layers:

- **Route guard** — `unsavedChangesGuard` (`services/unsaved-changes.guard.ts`) is a `canDeactivate` on `/add-customer` and `/edit-customer`. It calls `component.hasUnsavedChanges()` (the `HasUnsavedChanges` interface) and, if dirty, opens the accessible `ConfirmDialogService` dialog with `title: 'Discard changes?'`, buttons **Keep editing** (focused, cancels) / **Discard changes**. It covers Cancel, nav links, browser Back/Forward and Log out. It deliberately lets a redirect to `/login?sessionExpired=true` through — blocking that would strand the user on a form they can no longer save.
- **`beforeunload`** — each component listens via `host: { '(window:beforeunload)': ... }` and calls `event.preventDefault()` when dirty, covering reload / tab close / typing another URL (not router navigations, so the guard can't see them).
- **What "dirty" means** — `hasUnsavedChanges` is a `computed`: `!saved() && isCustomerFormDirty(model(), baseline)`. It compares *values* against a baseline (blank form when adding; `toFormModel(loadedCustomer)` when editing), not a touched flag, so typing something and putting it back clears the warning, and a customer merely *loading* into the edit form isn't "dirty". A `saved` signal is set right after a successful save **before** `router.navigate`, so saving never prompts; a failed save keeps the warning.
- `app.config.ts` sets `withRouterConfig({ canceledNavigationResolution: 'computed' })`. Without it, cancelling a Back-button navigation overwrites a history entry and a *second* Back press skips the guard.

### Routing, titles & focus

- Every page is **lazy-loaded** (`loadComponent` in `app.routes.ts`), so the initial bundle only carries the shell.
- Each route has a `title`; `AppTitleStrategy` renders it as `"<page> · Customer Management System"` (WCAG 2.4.2).
- After each client-side navigation (not the initial load) `App` focuses the new page's `<h1>` (or `<main>`), via `afterNextRender` — otherwise keyboard/screen-reader users get no signal that the page changed. The layout is `skip link → <header>(nav) → <main id="main" tabindex="-1"> → <footer>`.

### User feedback: toasts, inline errors, confirmations

Same convention in all three sibling apps (customer, employee, imalo); the shared files (`notification.service.ts`, `confirm-dialog.service.ts`, their components and specs) are identical copies, so a change to one belongs in all three.

- **Success → toast, fired by the service.** A service method that changes data confirms it in a `tap` (`NotificationService.show('Customer deleted successfully.')`), so every caller gets it. Bulk callers use the `…Silently` variant (the plain method is the silent one plus the `tap`) and show one summary toast instead of one per item.
- **Failure of an action → inline, next to it.** The component catches the `HttpErrorResponse`, turns it into text with `extractErrorMessage(error, 'Failed to <action>')` (`utils/extract-error-message.ts`) and shows it in a `role="alert"` box beside the form or button. No `console.error` for errors the user already sees.
- **Failure of a page load → an alert box in place of the content**, never an empty page or a "Loading…" that never ends.
- **Error toasts** are only for failures with no better place on the page (a bulk action's summary, test-data generation). They stay until dismissed (`show(message, 'error')` defaults to no timeout) and are `role="alert"`; success toasts are `role="status"` and last 6 s.
- **Confirmations** — `ConfirmDialogService.confirm(message, { title?, confirmLabel?, cancelLabel?, variant? })`, never `window.confirm()`. Give a question title and a verb label (`{ title: 'Delete customer?', confirmLabel: 'Delete', variant: 'danger' }`); `variant: 'danger'` is for what can't be undone (delete, discard edits). One dialog at a time: a newer `confirm()` answers an unanswered one with `false`.

### Accessibility conventions (WCAG 2.2 AA)

Verified with axe-core (tags `wcag2a/2aa/21a/21aa/22aa/best-practice`) against every route plus the invalid-form, open-dialog and open-mobile-menu states — zero violations. Keep it that way:

- **Contrast**: white text on a fill needs 4.5:1. `--spectrumColor3` (`#00917c`, 3.9:1) is **decorative only** (gradient, large numeral, focus/border accents) — text-bearing fills use `--spectrumColor1/2`, `--secondaryColor` (btn-secondary), `--dangerColor1` (`#a45a82`). Grey secondary text uses `--mutedText`. Form-field borders are `#767676` (3:1, WCAG 1.4.11). The navbar and login-panel gradients stop at `--spectrumColor2`.
- **Focus**: never `outline: none`. Global `:focus-visible` is a 3px dark-green outline (white on navbar/footer/table header). It's an *outline*, not a box-shadow, because `.shadow-none` on buttons would erase a shadow-based ring.
- **Interactive elements are real ones**: navigation is `<a routerLink>`, actions are `<button>`, column-sort controls are `<button>`s inside `<th aria-sort>`. Never `<a (click)>` without an `href` or `<th role="button">` (not keyboard-reachable).
- **Names & structure**: one `<h1>` per page, card titles are `<h2>` (styled by class, not tag), row buttons get `aria-label="<Action> <customer name>"` (starts with the visible text), decorative images have `alt=""`, form groups are `<fieldset><legend>`, tables have a (visually-hidden) `<caption>`, scrollable regions are `role="region"` + `tabindex="0"` + `aria-label` (only the sideways-scrolling `.table-responsive` tables; see the Tables note below — no region scrolls vertically).
- **Live regions**: alerts are `role="alert"`, loading states `role="status"`, the customer list has a polite result-count announcer, toasts are `role="status"` (errors `role="alert"`). Error toasts don't auto-dismiss; success toasts last 6s.
- **Dialog** (`ConfirmDialogComponent`): `role="alertdialog"` + `aria-modal` + `aria-labelledby`/`-describedby`; focus goes to **Cancel** (the non-destructive choice) on open, Tab/Shift+Tab are trapped, Escape cancels, and focus returns to the trigger as soon as it's answered. Has its own spec (`confirm-dialog.component.spec.ts`).
- **Motion**: `prefers-reduced-motion` disables animations/transitions globally. The mobile navbar menu is signal-driven (`menuOpen` → `aria-expanded`), so Bootstrap's JS bundle is **not** loaded anymore — don't add `data-bs-*` attributes expecting them to work.
- **Deliberately left**: the login page's "Forgot password?" link and "Contact us!" button are non-functional placeholders (content decision, not a11y plumbing).

### Services

- `user-login.service.ts`, `verify-token.service.ts`, `auth-guard.service.ts`, `session-storage.service.ts`, `http-header-service.ts`, `auth-error.interceptor.ts` — see Login flow / App config above.
- `get-customer.service.ts`, `add-customer.service.ts`, `edit-customer.service.ts`, `activate-customer.service.ts`, `delete-customer.service.ts`, `audit-log.service.ts`, `export-customer.service.ts`, `global-audit-log.service.ts` — one per `CustomerController` endpoint group (see [api](api.md)).
- `product.service.ts`, `product-details.service.ts`, `purchase.service.ts` — the catalogue, one product + its buyers, and a customer's purchases (all `httpResource`-based like `audit-log.service.ts`; `PurchaseService.purchaseProduct` is the POST). See [products-and-purchases](products-and-purchases.md).
- `monthly-activity.service.ts` — the Charts tab's time-series data (`httpResource`-based, same lazy-load-on-first-call shape as `product.service.ts`). See [charts](charts.md).
- `navbar.service.ts`, `footer.service.ts` — simple show/hide state (a `signal<boolean>`, exposed read-only via `.asReadonly()`) for chrome that shouldn't appear on the login screen.
- `health.service.ts` — polls `GET /health` (see [api](api.md)) every 15s via `pollApiHealth()`; consumed only by the root `App` component (`app.ts`), not routed/component-scoped like the others.

**Request cancellation** (`get-customer.service.ts`, `global-audit-log.service.ts`): `loadCustomers`/`loadAllAuditLog` are piped through a `Subject<Params>` + `switchMap`, not a direct `.subscribe()` per call — so a fast page/search/sort change that fires a second request before the first resolves cancels the first instead of letting a stale response race the newer one and overwrite it.

**Transient-error retry** (`activate-customer.service.ts`): deactivate/reactivate calls use `retry(TRANSIENT_ERROR_RETRY_CONFIG)` (status `0` or `>= 500` only, `timer(retryCount * 500)` backoff) instead of a blind `retry(3)` — a `409` (already deactivated/active) or `400` shouldn't be retried, since retrying won't change the outcome and just delays the user-facing error.

**Customer lifecycle actions in the UI** (`customer-list.component.ts`, `customer-details.component.ts`): Edit is always available; Deactivate shows only when active; Reactivate and Delete show only when deactivated — mirroring the stored-procedure rules in [database](database.md) rather than re-deriving them. Both Deactivate and Delete are guarded by the in-app `ConfirmDialogService` dialog (not the native `confirm()`) before the request fires; Reactivate and Edit are not (both are non-destructive/reversible). Edit and "Register customer" are real `<a routerLink>` links (navigation), not buttons that call `router.navigate()`. On `customer-details` the action buttons (Edit / Deactivate or Reactivate / Delete) live in the **page header, top-right**, with a small "← Back to customers" link above the title; the visible "Deactivate this customer before deleting it" hint under them is what the disabled Delete's `aria-describedby` points at. Action errors render as alerts directly under the header.

**Search, sorting & pagination** (`customer-list.component.ts`): all three are server-side — `GET /api/customer/all` takes `pageNumber`, `pageSize` (50, capped at 100), `searchTerm`, `sortColumn` (`name`/`email`/`phoneNumber`), `sortDirection` (`asc`/`desc`), and `Customer_List` does the filtering/sorting/paging in SQL (see [database](database.md)). `GetCustomerService.loadCustomers(params)` re-fetches on every change to page, search term, or sort; `customersSignal` holds only the current page, not the whole table. Changing the search term or clicking a column header resets to page 1. The search box is debounced (300ms) since each keystroke is now a network call, not an in-memory filter. Pagination controls only render when there's more than one page — with the two seeded demo customers you'll never see them locally; that's expected, not a bug. A Status column renders each row's `status` as a colored badge via `statusLabels` (Active/Deactivated/Test, same three codes as [database](database.md)) — display only, not sortable/filterable server-side. Fetch errors render as an inline alert (`errorMessage()`) instead of silently showing an empty table.

**Audit trail** (`customer-details.component.ts`): `AuditLogService.loadAuditLog(customerId)` is called alongside the customer fetch (from the `id`-input effect, see "Route params" below), and rendered as its own card (newest first). `AuditLogService` is built on **`httpResource`**: the request is a function of a `customerId` signal (so a new guid cancels the old request and no request fires until one is set), and `loadAuditLog()` calls `.reload()` when asked for the guid it already has. Unlike the customer record itself (which updates in place via `updateCustomerLocally`), the audit list has no local-patch path, so it's re-fetched via a constructor `effect()` that watches `activationLoading()` and reloads on the true→false transition (i.e. right after a deactivate/reactivate call resolves) — without this, the trail would look stale until the next full page load even though the status right above it just updated live. Fetch errors render inline (`errorMessage()`) in place of the normal card content. On `customer-list` a failed load shows only the error alert — the "No customers yet" empty state is suppressed while `errorMessage()` is set, since it would misreport a failure as an empty result.

**Bulk delete** (`customer-list.component.ts`): checkboxes on each row (plus a select-all-on-page checkbox) build a `selectedGuids` signal, scoped to the current page only — selections don't persist across a page change. `bulkDeleteSelected()` is not a plain bulk-delete: it splits the selection by current status — Active customers are only **deactivated** (mirroring the single-row rule that an Active customer can't be deleted directly), while already-Deactivated/Test customers are actually deleted — then runs both sets of requests and shows one `confirm()` prompt beforehand summarizing the split (e.g. "3 are active and will only be deactivated... 2 are already deactivated... and will be permanently deleted"). Don't treat a "bulk delete" bug report as one operation; check which branch (deactivate vs. delete) the affected rows fell into.

**Toolbar & button styling** (`customer-list.component.ts`/`.html`): the search box (left) and the Export CSV / Register customer / Bulk delete buttons (right, `.list-toolbar` in the component CSS) sit on one wrapping row above the table. The toolbar is **always rendered**; only the table area is gated on loading (a spinner when there's no data yet, otherwise the previous page stays visible, dimmed via `.is-refreshing`) — gating the whole component on `isLoading()` used to destroy the search input on every debounced fetch and drop focus mid-typing — `addCustomer()` on `CustomerListComponent` just navigates to `/add-customer` (moved here from `HomeComponent`, which now only renders a heading + `<app-customer-list>`). All non-destructive action buttons (Edit, Export CSV, Register customer, Reactivate, pagination Previous/Next) use `btn btn-primary`; only genuinely destructive/irreversible actions (Deactivate, Delete, Bulk delete) stay `btn-danger`. `.btn-primary`'s green comes from the single global override in `styles.css` (`--spectrumColor2`) — don't re-add a component-local `.btn-primary` override.

**CSV export** (`customer-list.component.ts`): the "Export CSV" button calls `ExportCustomerService.exportCustomers()` with the list's *current* `searchTerm`/`sortColumn`/`sortDirection` signals — same filter/sort the table is showing, but not limited to the current page (see [database](database.md)). The service requests the API with `responseType: 'blob'` and triggers the browser download itself (`URL.createObjectURL` + a synthetic `<a download>` click) with a client-generated filename, rather than reading the server's `Content-Disposition` filename — that header isn't in the API's CORS exposed-headers list, so JS can't read it cross-origin, and exposing it wasn't judged worth widening the CORS config for.

**Global audit log** (`global-audit-log.component.ts`, `/audit-log`): like `customer-list`, pagination is server-side (`GlobalAuditLogService.loadAllAuditLog`, `GET /api/customer/audit-log/all`), but there's no search or sort — just a newest-first paginated table (page size 50, same as the customer list). A row's customer name links to `/customer-details` only when the customer still exists (`entry.customerFirstName`/`customerLastName` non-null); a deleted customer renders as plain text, `(deleted customer <guid>)` — see [database](database.md) for why the API can return rows for a GUID that no longer resolves to a customer. Action names go through `auditActionLabel` (`utils/audit-action-label.ts`, identical in all three apps: "SalaryChanged" → "Salary changed"), here and in the details page's audit trail. "Clear audit log" (disabled while there's nothing to clear, "Clearing…" while it runs) confirms with the danger variant; `deleteAllAuditLog()` empties the service state and shows the success toast, and a failure shows inline. The same page, service and behaviour exist in Imalo (minus "Performed by").

**Interface types mirror the API's JSON exactly** (`src/app/interfaces/`). Response interfaces (`Customer`, `Product`, `AuditLogEntry`, ...) are separate from request ones (`CreateCustomerRequest`, `UpdateCustomerRequest`, `CreateProductRequest`) — creates carry no `guid` (the DB generates it; `POST /register` and `POST /product` return it as `data`), and `UpdateCustomerRequest` has no `status`. `EditCustomerService.editCustomer` takes the whole edited `Customer` (to update the local list with) but sends only the editable fields. Codes are enums (`Gender`, `CustomerStatus`, and the `AuditAction` string union). Dates stay strings — JSON has no date type — typed with the `IsoDateTime` (UTC instant, ends in `Z`) / `IsoDate` (`YYYY-MM-DD`) aliases from `interfaces/iso-date.ts`; display them with the `date` pipe, which converts `IsoDateTime`s to the viewer's time zone and treats an `IsoDate` as a local calendar date (don't pass `'UTC'` to it for a birthdate — that can shift it a day). **The API omits null properties**, so an optional field arrives as a missing key: type it `field?: T`, not `T | null` (e.g. `Customer.birthdate?`, `Product.comment?`, `GlobalAuditLogEntry.customerFirstName?`).

**Birthdate is a native `<input type="date">`** in both `add-customer` and `edit-customer` — replaced three separate year/month/day text boxes. The API wants `YYYY-MM-DD` (it binds to a `DateOnly`, stored in a real `DATE` column — see [database](database.md)) and returns the same format, and a date input's `.value` is always exactly that format, so the value round-trips with no conversion in either direction. (A `toDateInputValue()` zero-padding helper for legacy unpadded `NVARCHAR` values was removed once the column became a `DATE`.)

**API-availability banner** (`app.ts`/`app.html`, the root shell — not a routed component, so it's not in the table above): `App` injects `HealthService` and exposes `apiAvailable = toSignal(healthService.pollApiHealth(), { initialValue: true })`. `app.html` renders `<router-outlet>` only when `apiAvailable()` is true; otherwise it shows a static "API is not running" card instead of the current page. Polling only runs in the browser (`isPlatformBrowser` check) — during SSR/prerendering it's hardcoded to `of(true)` instead, because a repeating `timer()`-based poll would keep the app permanently "not stable," and the prerender step waits for stability and would hang forever.

**Frontend unit tests**: the project was scaffolded straight onto Vitest configured exactly as `ng new` generates it: the `angular.json` `test` target names only `@angular/build:unit-test` and relies on its defaults (Vitest runner, `tsconfig.spec.json`, the `development` build, jsdom, watch mode only in an interactive terminal), plus `"types": ["vitest/globals"]` in `tsconfig.spec.json`, no separate Vitest config file — same as the sibling apps — there's no Karma here to migrate away from, despite that being the more commonly-seen setup in older Angular tutorials. `describe`/`it`/`expect`/`vi`/etc. are global (no imports needed). `jsdom` is the DOM-emulation dependency (installed as a devDependency — Vitest requires either that or `happy-dom` and picks whichever is present). Run with `ng test` (or `ng test --watch=false` for a single run). Coverage: `get-customer.service.spec.ts` and `audit-log.service.spec.ts` mock HTTP via `provideHttpClientTesting()`/`HttpTestingController` (the `httpResource`-backed audit-log service needs `TestBed.tick()` after `loadAuditLog()` to issue the request and `await ApplicationRef.whenStable()` after `flush()` before asserting — see that spec's `load`/`settle` helpers); the form components (`add-customer`, `edit-customer`, `user-login`) are tested by `submit(component.customerForm)` from `@angular/forms/signals` against stubbed services, and `edit-customer`/`customer-details` use `TestBed.createComponent` + `fixture.componentRef.setInput('id', …)` since `id` is a signal input; `customer-list.component.spec.ts` constructs the component directly via `TestBed.runInInjectionContext(() => new CustomerListComponent())` with hand-rolled service stubs (not `TestBed.createComponent`, since these tests exercise the sort/paging/search-debounce logic, not the template) — that pattern is required because the component uses field-initializer `inject()` calls, which need an active injection context to run. The full auth chain also has dedicated specs — `session-storage.service.spec.ts`, `http-header-service.spec.ts`, `verify-token.service.spec.ts`, `auth-guard.service.spec.ts`, `auth-error.interceptor.spec.ts` (the functional interceptor, tested via `provideHttpClient(withInterceptors([...]))`), `user-login.service.spec.ts` — plus `activate-customer.service.spec.ts`, which covers the deactivate/reactivate local-cache update, the not-found-locally error path, and (via `vi.useFakeTimers()`) that `TRANSIENT_ERROR_RETRY_CONFIG` actually retries a 5xx and doesn't retry a definitive 4xx. The form components, the confirm dialog, `customer-list`, `customer-details` and `global-audit-log` also have specs. `about.component.spec.ts` covers only the test-customer generator (`addTestCustomers`, with hand-rolled service stubs via `TestBed.runInInjectionContext`), and `utils/random-purchases.spec.ts` its product-picking helper. Still without a spec: the static parts of `about`, the navbar/footer, `notification`, and `home`/`page-not-found` (trivial). The auth chain was prioritized first because a regression there is a security or session-handling bug, not just a display bug. There's no automated a11y test in the suite — the axe-core pass described under "Accessibility conventions" was a manual Playwright run, so re-run it after UI changes.

### UI design language (shared styles)

The palette is `--spectrumColor1..4` (dark green → mint) plus `--dangerColor1` (mauve) in `UI/src/styles.css`; the font is Jost. Every routed page shares the same building blocks, defined once in `styles.css` — reuse them instead of adding per-component copies:

- **Page shell**: wrap a page in `<div class="page">` (max-width 1320px; add `page-narrow` for text-heavy pages like About). `app-root` is a flex column with `app-footer { margin-top: auto }`, so the footer sits at the bottom of short pages. Start each page with `.page-header` > `.page-title` (+ optional `.page-subtitle`, actions on the right) — titles are plain sentence-case, no trailing colon.
- **Cards**: `class="card app-card"` > `.card-body` > `<h5 class="card-title">` (uppercase, mint underline). Space stacked cards with `d-flex flex-column gap-4` / `row g-4`, not per-card margins. The old `.card-header` mint bar is no longer used by any page.
- **Tables**: `app-card table-card` wrapping `table table-themed table-striped table-hover` (dark-green header, mint stripes/hover via Bootstrap table CSS variables). Used by the customer list, products table and global audit log. Sortable headers use the shared `.sort-button` (a `<button>` inside `<th aria-sort>`). `.table-themed` has a `min-width: 760px`, so on phones the table scrolls sideways inside its focusable `.table-responsive` region instead of crushing columns into tall wraps. `styles.css` also sets `.table-responsive { overflow-y: hidden }`: Bootstrap only sets `overflow-x: auto`, which the browser turns into `overflow-y: auto` too, so the table became a vertical scroll container that trapped the mouse wheel and stopped the page scrolling. **Never give a table or list its own `max-height`/`overflow-y: auto`** — vertical scrolling belongs to the page alone (the customer-details Purchases and Audit trail lists used to have a 20rem inner scroll and were unwrapped for the same reason).
- **States**: `.loading-state` (spinner) and `.empty-state`, both inside an `app-card`.
- **Details page rows** are `<dl class="detail-list">` label/value rows (component-scoped CSS in `customer-details.component.css`).
- **Forms** (`add-customer`/`edit-customer`): two `app-card` columns, then a `.form-actions` row *below* both cards (submit + Cancel) and the API error alert under that. Every `<label>` has `for=` matching the control's `id`; both forms show `is-invalid` feedback on every required field.
- **Bootstrap overrides** to keep the palette: `.badge.bg-success` → `--spectrumColor2`, teal focus ring on `.form-control`/`.form-select`, `accent-color` on checkboxes, `code` colour. The navbar is `navbar-dark` on a dark-green→teal gradient (`--spectrumColor4` is too light for white text, so it isn't in the gradient) with the black logo flipped to white via CSS `filter`.
- **Motion** (same approach in all three apps): durations and easing curves are tokens in `:root` (`--duration-fast`/`--duration-base`, `--ease-out`/`--ease-in`/`--ease-spring`); use them instead of one-off timings. Buttons (`.btn`, except `.btn-link`) lift on hover and press in on click; alerts slide in. Anything a user opens and closes uses Angular's native `animate.enter="reveal-enter" animate.leave="reveal-leave"` (global classes in `styles.css`), not `@angular/animations`, which is deprecated and not installed. Toasts use `animate.enter`/`animate.leave` with their own slide classes. Route changes cross-fade through `withViewTransitions({ skipInitialTransition: true })` in `app.config.ts` with the `::view-transition-*` rules in `styles.css`; `header` has its own `view-transition-name` so the navbar stays put. The navbar: link underlines grow from the centre on desktop, the phone menu slides open (grid rows `0fr`→`1fr`, `visibility` hides the links from Tab while it's shut, and a `.navbar-menu` wrapper is `display: contents` on desktop), and the menu button's bars fold into an X from `aria-expanded`. TestBed disables animations by default, so `animate.leave` elements are removed immediately in specs. `prefers-reduced-motion` turns all of it off, including hover transforms and view transitions.
- The footer is deliberately minimal (© year + tagline). It used to be a Bootstrap template with placeholder links, lorem ipsum and Font Awesome icons that were never loaded.

## Gotchas / conventions

- **The app is zoneless** (`provideZonelessChangeDetection()`; no `zone.js` dependency at all). Every component that used to hold plain mutable fields (`loading: boolean = false`, etc.) has been converted to `signal(...)` + `.set(...)`, and templates call them as functions (`submitted()`, not `submitted`). If you add new mutable component state, it **must** be a signal (or drive one) — a plain field mutation no longer triggers change detection because there's no zone left to notice it.
- `customer-list.component.ts`'s duplicate-GUID check runs as an `effect()` over the `duplicateGuids` computed signal, in the **constructor** (not `ngOnInit`) — it re-evaluates whenever `customers()` actually changes. A one-time synchronous check right after the async `loadCustomers()` call used to always see a stale/empty list and never fire; don't move this back to a one-shot check in `ngOnInit`.
- `NavigationBarComponent.logout()` explicitly calls `SessionStorageService.removeSessionStorage()` before navigating to `/login` — don't replace it with a plain `routerLink="login"` again. It used to be exactly that, and only "worked" because `UserLoginComponent.ngOnInit()` happens to clear storage too; that's an implicit dependency on another component's unrelated side effect, not something logout should rely on.
- Use `unknown`, not `any`, for caught errors in new code (`auth-guard.service.ts`, `health.service.ts` narrow via `instanceof HttpErrorResponse`) — matches the rest of the codebase's typed-error handling.

## Known gaps / resolved

- ~~`SessionStorageService.getSessionAccessToken()` returned sentinel strings (`'ERROR-NO-SESSION-TOKEN'`, `'ERROR-NON-BROWSER-ENVIRONMENT'`) instead of `null` when there was no token, making `HttpHeaderService`'s `if (token)` check always truthy~~ — fixed: it now returns `string | null`, so anonymous requests (including the login POST and SSR calls from Node) no longer carry a bogus `Authorization` header.
- ~~The nav bar's "Log out" link only did `routerLink="login"` — it never cleared `sessionStorage` itself~~ — fixed, see `NavigationBarComponent.logout()` above. Verified end-to-end with a real headless-browser run (Playwright): logged in, confirmed the JWT was in `sessionStorage`, clicked "Log out", confirmed it was gone, and confirmed navigating back to `/customers` bounced to `/login?sessionExpired=true` instead of showing data.
- No e2e test runner is currently configured (Vitest covers unit tests only).
