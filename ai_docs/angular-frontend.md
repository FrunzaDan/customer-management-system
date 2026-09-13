# Angular Frontend

## What it is

Global HTTP/router wiring, the auth guard, the login flow, the route/component map, and the services layer — everything under `UI/customer_management_system`.

## Key files / paths

- `UI/customer_management_system/src/environments/environment.ts`
- `UI/customer_management_system/src/app/app.config.ts`, `app.routes.ts`
- `UI/customer_management_system/src/app/services/auth-guard.service.ts`, `verify-token.service.ts`, `auth-error.interceptor.ts`
- `UI/customer_management_system/src/app/components/user-login/user-login.component.ts`
- `UI/customer_management_system/src/app/services/user-login.service.ts`, `session-storage.service.ts`
- `UI/customer_management_system/src/app/components/*`
- `UI/customer_management_system/src/app/services/*`

## How it works

### App config, routing & the auth guard

**Config** (`environment.ts`):
```ts
export const environment = {
  CustomerManagementSystemAPI: 'https://localhost:7145',
  EmailRegex: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  PhoneRegex: "^[0-9]{9,12}$",
  UserName: "^[a-zA-Z0-9 ]*$"
};
```
Every service builds its request URL off `CustomerManagementSystemAPI`.

**`app.config.ts`** wires up: Router (component input binding, view transitions, scroll restoration), **SSR client hydration** (`provideClientHydration(withEventReplay(), withNoIncrementalHydration())`), `HttpClient` on the **fetch-based backend** (`provideHttpClient(withFetch(), withInterceptors([apiLoggerInterceptor, authErrorInterceptor]))` — the fetch-based backend matters for SSR: during server-side rendering, HTTP calls run through Node's native `fetch()`, not a browser's, see [build-and-run](build-and-run.md) for the TLS implication of that), and **`provideZonelessChangeDetection()`** — there's no `zone.js` in this app at all; see Components/state below for what that means.

**Routing & the auth guard** (`app.routes.ts`, `auth-guard.service.ts`): all routes except `/login` and the catch-all 404 carry `canActivate: [authGuardFn]`. The guard:
1. Calls `VerifyTokenService.isTokenValid()`, which hits `GET /api/Authentication/verify-token` with whatever token is in session storage.
2. `200` → allow navigation. Anything else (401, network error, TLS error) → clear session storage, redirect to `/login?sessionExpired=true`.

Because routes are guarded and the app uses SSR, this guard's HTTP call can run inside **Node** (server-side) as well as in the browser (client-side, post-hydration).

**Global 401 handling** (`auth-error.interceptor.ts`): a functional `HttpInterceptorFn` (`authErrorInterceptor`) catches any 401 from any API call — except calls to `/api/Authentication/*`, which manage their own 401/403 semantics — clears session storage, and redirects to `/login?sessionExpired=true`. This exists so an expired token discovered mid-session (not just at navigation time, when the guard checks) is handled uniformly, without every component needing its own 401 branch.

- `verify-token.service.ts`'s `isTokenValid()` is deliberately a simple `pipe(map(() => true), catchError(() => of(false)))`. An earlier version used a manually-managed RxJS `Subject` that crashed (`Cannot read properties of null`) whenever the API returned a 401 with an empty body, orphaning the guard's subscription and cascading into hydration timeouts and an unclickable login form. **Don't reintroduce a manual `Subject` here.**
- The guard and the interceptor are two separate 401-handling paths by design (navigation-time vs. any-time-during-a-page) — don't collapse them into one without checking both are still exercised (route guards don't run for API calls made without a navigation, e.g. a button click on a page you're already on).

### Login flow

1. User submits Merchant ID + password → `UserLoginService.checkCredentials()` → `POST /api/Authentication/access-token`, returning a `CredentialsCheckResult { success, message }` discriminated result (checked via `response.status === 200`, not by string-matching the body).
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
| `customer-details` | `/customerDetails` | Single customer's full record (friendly status) plus its audit trail |
| `global-audit-log` | `/auditLog` | Paginated audit trail across every customer, newest first |
| `add-customer` | `/addCustomer` | Create-customer form |
| `edit-customer` | `/editCustomer` | Edit-customer form |
| `about` | `/about` | Static about/docs page, plus dev tools (API-call logging toggle, generate test customers) |
| `navigation-bar` | (shown/hidden via `NavbarService`) | Top nav — hidden on `/login`; owns the "Log out" action |
| `footer` | (shown/hidden via `FooterService`) | Page footer — hidden on `/login` |
| `display-error` | n/a | Reusable error display |
| `page-not-found` | `**` | 404 fallback |

Gender is stored/sent as an **integer**: `0` = Not declared, `1` = Male, `2` = Female — canonicalized across `add-customer` and `edit-customer` forms (both submit via typed reactive forms, `FormGroup<{...}>` built with `fb.nonNullable.group`; the `<select>` emits string values, converted with `Number(formValue.gender)` at submit time to match `Customer.gender: number`).

### Services

- `user-login.service.ts`, `verify-token.service.ts`, `auth-guard.service.ts`, `session-storage.service.ts`, `http-header-service.ts`, `auth-error.interceptor.ts` — see Login flow / App config above.
- `get-customer.service.ts`, `add-customer.service.ts`, `edit-customer.service.ts`, `activate-customer.service.ts`, `delete-customer.service.ts`, `audit-log.service.ts`, `export-customer.service.ts`, `global-audit-log.service.ts` — one per `CustomerController` endpoint group (see [api](api.md)).
- `navbar.service.ts`, `footer.service.ts` — simple show/hide state (a `signal<boolean>`, exposed read-only via `.asReadonly()`) for chrome that shouldn't appear on the login screen.
- `health.service.ts` — polls `GET /health` (see [api](api.md)) every 15s via `pollApiHealth()`; consumed only by the root `App` component (`app.ts`), not routed/component-scoped like the others.

**Request cancellation** (`get-customer.service.ts`, `global-audit-log.service.ts`): `loadCustomers`/`loadAllAuditLog` are piped through a `Subject<Params>` + `switchMap`, not a direct `.subscribe()` per call — so a fast page/search/sort change that fires a second request before the first resolves cancels the first instead of letting a stale response race the newer one and overwrite it.

**Transient-error retry** (`activate-customer.service.ts`): deactivate/reactivate calls use `retry(TRANSIENT_ERROR_RETRY_CONFIG)` (status `0` or `>= 500` only, `timer(retryCount * 500)` backoff) instead of a blind `retry(3)` — a `409` (already deactivated/active) or `400` shouldn't be retried, since retrying won't change the outcome and just delays the user-facing error.

**Customer lifecycle actions in the UI** (`customer-list.component.ts`, `customer-details.component.ts`): Edit is always available; Deactivate shows only when active; Reactivate and Delete show only when deactivated — mirroring the stored-procedure rules in [database](database.md) rather than re-deriving them. Both Deactivate and Delete are guarded by a native `confirm()` prompt before the request fires; Reactivate and Edit are not (both are non-destructive/reversible).

**Search, sorting & pagination** (`customer-list.component.ts`): all three are server-side — `GET /api/Customer/all` takes `pageNumber`, `pageSize` (20, capped at 100), `searchTerm`, `sortColumn` (`name`/`email`/`msisdn`), `sortDirection` (`asc`/`desc`), and `usp_getCustomers` does the filtering/sorting/paging in SQL (see [database](database.md)). `GetCustomerService.loadCustomers(params)` re-fetches on every change to page, search term, or sort; `customersSignal` holds only the current page, not the whole table. Changing the search term or clicking a column header resets to page 1. The search box is debounced (300ms) since each keystroke is now a network call, not an in-memory filter. Pagination controls only render when there's more than one page — with the two seeded demo customers you'll never see them locally; that's expected, not a bug. A Status column renders each row's `customerStatus` as a colored badge via `statusLabels` (Active/Deactivated/Test, same three codes as [database](database.md)) — display only, not sortable/filterable server-side. Fetch errors render as an inline alert (`errorMessage()`) instead of silently showing an empty table.

**Audit trail** (`customer-details.component.ts`): `AuditLogService.loadAuditLog(guid)` is called in `ngOnInit` alongside the customer fetch, and rendered as its own card (newest first). Unlike the customer record itself (which updates in place via `updateCustomerLocally`), the audit list has no local-patch path, so it's re-fetched via a constructor `effect()` that watches `activationLoading()` and reloads on the true→false transition (i.e. right after a deactivate/reactivate call resolves) — without this, the trail would look stale until the next full page load even though the status right above it just updated live. Fetch errors render inline (`errorMessage()`) in place of the normal card content.

**Bulk delete** (`customer-list.component.ts`): checkboxes on each row (plus a select-all-on-page checkbox) build a `selectedGuids` signal, scoped to the current page only — selections don't persist across a page change. `bulkDeleteSelected()` is not a plain bulk-delete: it splits the selection by current status — Active customers are only **deactivated** (mirroring the single-row rule that an Active customer can't be deleted directly), while already-Deactivated/Test customers are actually deleted — then runs both sets of requests and shows one `confirm()` prompt beforehand summarizing the split (e.g. "3 are active and will only be deactivated... 2 are already deactivated... and will be permanently deleted"). Don't treat a "bulk delete" bug report as one operation; check which branch (deactivate vs. delete) the affected rows fell into.

**Toolbar & button styling** (`customer-list.component.ts`/`.html`): the search box, Export CSV, Register customer, and Bulk delete buttons all sit on one `d-flex flex-wrap` row above the table — `addCustomer()` on `CustomerListComponent` just navigates to `/addCustomer` (moved here from `HomeComponent`, which now only renders a heading + `<app-customer-list>`). All non-destructive action buttons (Edit, Export CSV, Register customer, Reactivate, pagination Previous/Next) use `btn btn-primary`; only genuinely destructive/irreversible actions (Deactivate, Delete, Bulk delete) stay `btn-danger`. `.btn-primary`'s green comes from the single global override in `styles.css` (`--spectrumColor2`) — don't re-add a component-local `.btn-primary` override.

**CSV export** (`customer-list.component.ts`): the "Export CSV" button calls `ExportCustomerService.exportCustomers()` with the list's *current* `searchTerm`/`sortColumn`/`sortDirection` signals — same filter/sort the table is showing, but not limited to the current page (see [database](database.md)). The service requests the API with `responseType: 'blob'` and triggers the browser download itself (`URL.createObjectURL` + a synthetic `<a download>` click) with a client-generated filename, rather than reading the server's `Content-Disposition` filename — that header isn't in the API's CORS exposed-headers list, so JS can't read it cross-origin, and exposing it wasn't judged worth widening the CORS config for.

**Global audit log** (`global-audit-log.component.ts`, `/auditLog`): like `customer-list`, pagination is server-side (`GlobalAuditLogService.loadAllAuditLog`, `GET /api/Customer/auditLog/all`), but there's no search or sort — just a newest-first paginated table (page size 20, same as the customer list). A row's customer name links to `/customerDetails` only when the customer still exists (`entry.customerFirstName`/`customerLastName` non-null); a deleted customer renders as plain text, `(deleted customer <guid>)` — see [database](database.md) for why the API can return rows for a GUID that no longer resolves to a customer.

**Birthdate is a native `<input type="date">`** in both `add-customer` and `edit-customer` — replaced three separate year/month/day text boxes. The API still just wants `YYYY-MM-DD` (that's what `usp_createCustomer`/`usp_editCustomer` store as-is in `tbl_customers.birthdate`, an `NVARCHAR`, not a real `DATE` column, see [database](database.md)), and a date input's `.value` is always exactly that format, so no manual concatenation is needed on submit anymore. When *editing* an existing customer, `EditCustomerComponent.toDateInputValue()` zero-pads the stored value before patching the form — a date input silently fails to pre-fill on anything not strictly zero-padded, and the old three-box form could have saved e.g. `"2020-1-5"` for some existing records.

**API-availability banner** (`app.ts`/`app.html`, the root shell — not a routed component, so it's not in the table above): `App` injects `HealthService` and exposes `apiAvailable = toSignal(healthService.pollApiHealth(), { initialValue: true })`. `app.html` renders `<router-outlet>` only when `apiAvailable()` is true; otherwise it shows a static "API is not running" card instead of the current page. Polling only runs in the browser (`isPlatformBrowser` check) — during SSR/prerendering it's hardcoded to `of(true)` instead, because a repeating `timer()`-based poll would keep the app permanently "not stable," and the prerender step waits for stability and would hang forever.

**Frontend unit tests**: the project was scaffolded straight onto Vitest (`@angular/build:unit-test` + `"runner": "vitest"` in `angular.json`, `"types": ["vitest/globals"]` in `tsconfig.spec.json`) — there's no Karma here to migrate away from, despite that being the more commonly-seen setup in older Angular tutorials. `describe`/`it`/`expect`/`vi`/etc. are global (no imports needed). `jsdom` is the DOM-emulation dependency (installed as a devDependency — Vitest requires either that or `happy-dom` and picks whichever is present). Run with `ng test` (or `ng test --watch=false` for a single run). Coverage: `get-customer.service.spec.ts` and `audit-log.service.spec.ts` mock HTTP via `provideHttpClientTesting()`/`HttpTestingController`; `customer-list.component.spec.ts` constructs the component directly via `TestBed.runInInjectionContext(() => new CustomerListComponent())` with hand-rolled service stubs (not `TestBed.createComponent`, since these tests exercise the sort/paging/search-debounce logic, not the template) — that pattern is required because the component uses field-initializer `inject()` calls, which need an active injection context to run. The full auth chain also has dedicated specs — `session-storage.service.spec.ts`, `http-header-service.spec.ts`, `verify-token.service.spec.ts`, `auth-guard.service.spec.ts`, `auth-error.interceptor.spec.ts` (the functional interceptor, tested via `provideHttpClient(withInterceptors([...]))`), `user-login.service.spec.ts` — plus `activate-customer.service.spec.ts`, which covers the deactivate/reactivate local-cache update, the not-found-locally error path, and (via `vi.useFakeTimers()`) that `TRANSIENT_ERROR_RETRY_CONFIG` actually retries a 5xx and doesn't retry a definitive 4xx. Most other components/services (forms, `add`/`edit`/`delete-customer.service.ts`, etc.) still have no spec — the ones above were prioritized because a regression there is a security or session-handling bug, not just a display bug.

## Gotchas / conventions

- **The app is zoneless** (`provideZonelessChangeDetection()`; no `zone.js` dependency at all). Every component that used to hold plain mutable fields (`loading: boolean = false`, etc.) has been converted to `signal(...)` + `.set(...)`, and templates call them as functions (`submitted()`, not `submitted`). If you add new mutable component state, it **must** be a signal (or drive one) — a plain field mutation no longer triggers change detection because there's no zone left to notice it.
- `customer-list.component.ts`'s duplicate-GUID check runs as an `effect()` over the `duplicateGuids` computed signal, in the **constructor** (not `ngOnInit`) — it re-evaluates whenever `customers()` actually changes. A one-time synchronous check right after the async `loadCustomers()` call used to always see a stale/empty list and never fire; don't move this back to a one-shot check in `ngOnInit`.
- `NavigationBarComponent.logout()` explicitly calls `SessionStorageService.removeSessionStorage()` before navigating to `/login` — don't replace it with a plain `routerLink="login"` again. It used to be exactly that, and only "worked" because `UserLoginComponent.ngOnInit()` happens to clear storage too; that's an implicit dependency on another component's unrelated side effect, not something logout should rely on.
- Use `unknown`, not `any`, for caught errors in new code (`auth-guard.service.ts`, `health.service.ts` narrow via `instanceof HttpErrorResponse`) — matches the rest of the codebase's typed-error handling.

## Known gaps / resolved

- ~~`SessionStorageService.getSessionAccessToken()` returned sentinel strings (`'ERROR-NO-SESSION-TOKEN'`, `'ERROR-NON-BROWSER-ENVIRONMENT'`) instead of `null` when there was no token, making `HttpHeaderService`'s `if (token)` check always truthy~~ — fixed: it now returns `string | null`, so anonymous requests (including the login POST and SSR calls from Node) no longer carry a bogus `Authorization` header.
- ~~The nav bar's "Log out" link only did `routerLink="login"` — it never cleared `sessionStorage` itself~~ — fixed, see `NavigationBarComponent.logout()` above. Verified end-to-end with a real headless-browser run (Playwright): logged in, confirmed the JWT was in `sessionStorage`, clicked "Log out", confirmed it was gone, and confirmed navigating back to `/customers` bounced to `/login?sessionExpired=true` instead of showing data.
- No e2e test runner is currently configured (Vitest covers unit tests only).
