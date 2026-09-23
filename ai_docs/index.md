# Customer Management System — AI Docs Index

> **Read this file first**, per `learning_approach.md` and `CLAUDE.md`. It orients and links out; details live in the four concept docs below so each layer can be taught, corrected, and updated independently.

## What this app is

A small full-stack CRUD app for a merchant to manage their customers' records (personal info + address); one of the author's first full-stack projects, built to learn the stack rather than to run in production.

| Layer | Folder                             | Tech                                                           |
| ----- | ---------------------------------- | -------------------------------------------------------------- |
| UI    | `UI`                               | Angular 22 (zoneless, signals, SSR via `@angular/ssr`/Express) |
| API   | `API/CustomerManagementSystemApi`  | .NET 10 / ASP.NET Core Web API, C#                             |
| DB    | `DB/CustomerManagement`            | SQL Server (SSDT `.sqlproj`, deployed via `sqlpackage`)        |

```
Customer_Management_System/
├── build.sh              # restore + build + test .NET, then build Angular
├── run.sh                # start Docker DB, deploy schema, start API + Angular dev server
├── API/
│   ├── Postman/                                     # Postman collection for manual API testing
│   └── CustomerManagementSystemApi/
│       ├── CustomerManagementSystem.WebAPI/         # ASP.NET Core host: Program.cs, Controllers, appsettings.json
│       ├── CustomerManagementSystem.BusinessLogic/  # services, JWT creation, validation rules
│       ├── CustomerManagementSystem.DataAccess/     # ADO.NET, stored-proc calls, password hashing
│       ├── CustomerManagementSystem.Domain/         # models, config interfaces
│       └── CustomerManagementSystem.Tests/          # xUnit v3 unit tests (BusinessLogic + DataAccess, DB mocked out)
├── DB/CustomerManagement/
│   ├── Tables/                                  # Customer, CustomerAddress, Merchant, CustomerAuditLog, Product, CustomerPurchase
│   ├── StoredProcedures/                        # <Entity>_<Verb> — all data access goes through these
│   └── Scripts/PostDeployment/                  # PostDeployment.sql :r-includes the merchant seed + the 50-product catalogue seed
└── UI/
    └── src/app/
        ├── components/                          # one folder per route/view
        └── services/                            # HTTP calls, auth guard, session storage
```

- Three independently-runnable layers; nothing shares process or memory — they only talk over HTTP(S)/TCP.
- Local dev DB runs as a **Docker container** (Azure SQL Edge — the only Microsoft SQL Server image with a working Apple Silicon/arm64 build). See [build-and-run](build-and-run.md).
- This is a learning project: some rough edges are deliberately left as-is rather than "fixed" — each doc below has a "Known gaps" section for its layer; don't treat those as an unclaimed TODO list.

**Features**: merchant login (JWT-secured); register/view/edit/deactivate/reactivate/delete customers with an enforced status lifecycle; server-side search/sort/pagination on the customer list; bulk deactivate-or-delete from a multi-select; a per-customer and a global audit log; CSV export of the current filtered/sorted view; a "test customer" bulk generator (each generated customer also gets 1–5 purchases) exempt from the normal delete lifecycle; a live API-availability banner backed by `/health`; a seeded 50-product catalogue (extensible via an "Add product" form) with per-customer purchases (shown on customer details) and a Products tab with sold/inventory/left and who bought what; a Charts tab with catalogue and time-series charts (see [charts](charts.md)).

## Architecture at a glance

**Connection 1 — UI → API.** The Angular app calls the API over HTTPS as plain JSON REST (`GET`/`POST`/`PATCH`/`DELETE`); every call after login carries `Authorization: Bearer <jwt>`. Each `CustomerController` endpoint group has a matching Angular service (`get-customer.service.ts`, `create-customer.service.ts`, ...) that wraps the `HttpClient` call, types the response via an interface, and exposes it as an `Observable` (or a signal derived from one) to its component. See [angular-frontend](angular-frontend.md).

**Connection 2 — API → DB.** Inside the API, `WebAPI` (controllers — the thin presentation layer) calls `BusinessLogic` (validation, JWT issuing, the customer/merchant logic), which calls `DataAccess` (`DbUtils.cs`/`DbHelper.cs` — plain ADO.NET `SqlConnection`/`SqlCommand`/`SqlDataReader`, no ORM), which calls SQL Server through **stored procedures only** — no inline SQL. `Domain` sits underneath all of it holding the models and config interfaces the other three layers share. Every mutating stored proc follows one convention — a `(Result INT, Message NVARCHAR)` row that `DbHelper` turns directly into the HTTP status and message returned to the client — so controllers never contain branching status-code logic themselves. See [api](api.md) and [database](database.md).

**Auth.** Login (`POST /api/authentication/access-token`) checks credentials against `Merchant` (PBKDF2 hash comparison, not stored SQL logic) and mints an HMAC-SHA256 JWT with the merchant's ID and role as claims. There is exactly **one** validation path for every later request: ASP.NET Core's `AddJwtBearer` middleware, run once per request before any controller code executes. On the Angular side this is backed by two independent, deliberately-not-merged checks — a route `canActivate` guard that calls `GET /verify-token` before allowing navigation to a protected route, and a global HTTP interceptor that catches a 401 from _any_ call, at any time, and bounces to `/login`. See [api](api.md) (issuing/validating) and [angular-frontend](angular-frontend.md) (guard/interceptor).

## Diagrams (`Documentation/Diagrams/`)

Three hand-drawn sketches from the original pre-.NET-10/Angular-22 design. The overall shape they draw — UI → API → DB, stored procedures only, one JWT validation path — still holds, and they're a faster way to get oriented on that shape than prose. But they're pictures of an earlier snapshot of the code, not living docs, so treat the concept docs below as authoritative wherever the two disagree. Specific things that have since moved on:

- **`CMS_General_Flow.PNG`** — UI↔API↔DB call chain, the API solution's internal layering (`Controllers` → `CMS Library`'s Business Logic/Data Access → `DbUtils.cs`), and the Angular component/service/interface/`Observable` shape. Still accurate. Lists `GET/POST/PUT/DELETE` as the verb set; the API now actually uses `GET/POST/PATCH/DELETE` (`PATCH` for edit/deactivate/reactivate, since those are partial updates, not full replacements).
- **`CMS_Security_JWT.PNG`** — token issuing (`JwtCreation.cs` → claims → `header.payload.signature`) and a separate `JwtValidation.cs` step for checking incoming requests. The issuing side is still accurate. The separate `JwtValidation.cs` is **dead code that was later deleted** — validation was consolidated into the single `AddJwtBearer` middleware path described above; if you see `JwtValidation.cs` referenced anywhere else (old comments, this diagram), it's stale. The `Merchant` password column is drawn as a plain `SHA2_256` hash — that was superseded by salted PBKDF2 (see [api](api.md)).
- **`CMS_Login_Process.PNG`** — the login POST → JWT → session storage → subsequent routing through an auth guard that injects a verify-token service. Still accurate at the sequence level. It shows an `app-routing.module` with `canActivate`; Angular has since moved to standalone components, so this is `app.routes.ts` with a functional `authGuardFn` now, and component state along the way is signals rather than `zone.js`-watched fields.

## Documented Concepts

- [api](api.md) — ASP.NET Core request pipeline, controllers, validation, JWT auth, password hashing, xUnit v3 test setup, API-side known gaps.
- [database](database.md) — `Customer`/`CustomerAddress`/`Merchant` schema, stored procedures, status-code lifecycle, audit log, DB-side known gaps.
- [angular-frontend](angular-frontend.md) — app config/routing/auth guard, login flow, route/component map, services, Angular-side known gaps.
- [products-and-purchases](products-and-purchases.md) — `Product`/`CustomerPurchase`, the seeded catalogue, the record-a-purchase rules, sold/inventory/left, the Products tab and the customer-details Purchases card.
- [charts](charts.md) — the Charts tab: catalogue charts off the existing product data, time-series charts off the new `Report_GetMonthlyActivity` aggregate, and why every chart here is single-hue.
- [build-and-run](build-and-run.md) — Docker SQL Server, `build.sh`/`run.sh`, test login, TLS-trust gotchas.

Before exploring source directly, read the relevant doc above.

**Starting points for common tasks:**

- Changing a customer field, a validation rule, or the status lifecycle → [database](database.md) for the schema/proc rules, then [api](api.md) for where C# validates before the DB is touched.
- Changing products, stock, purchases, or the Products tab → [products-and-purchases](products-and-purchases.md), then [database](database.md) for the delete/transaction conventions it follows.
- Changing login, tokens, or roles → [api](api.md)'s JWT section, then [angular-frontend](angular-frontend.md)'s auth guard/interceptor section.
- Changing a list/table page (search, sort, paging, bulk actions) → [angular-frontend](angular-frontend.md)'s component notes, cross-referenced with [database](database.md)'s `Customer_List` pagination convention.
- Adding or changing a chart on the Charts tab → [charts](charts.md) first — it explains which data is already available client-side vs. needs a DB aggregate, and why every chart is single-hue.
- Something won't start locally (Docker, TLS, ports) → [build-and-run](build-and-run.md).

## Glossary

Domain terms and magic numbers used across this codebase — check here before assuming a number or acronym is arbitrary.

- **Merchant** — the API's authenticated principal; the user who logs in and manages customers. Stored in `Merchant`. Not the same as a "customer."
- **Customer** — the record being managed (name, contact info, address). Stored in `Customer` + `CustomerAddress`.
- **Customer `StatusCode` values** — `1901` = active, `1903` = deactivated, `1904` = test (fictitious customers created via the About page's bulk generator, each with 1–5 purchases). See [database](database.md).
- **Merchant `RoleCode` values** — `1801` = the only role currently in use. See [api](api.md).
- **Depot** — the API/UI name for the warehouse a product's stock is held in (`Product.Warehouse` in the DB); the original request said "depos". See [products-and-purchases](products-and-purchases.md).
- **Sold / inventory / left** — a product's units sold, originally stocked, and remaining; `sold = inventory - left`, derived in SQL. See [products-and-purchases](products-and-purchases.md).
- **GUID** — customer/product primary key: a `UNIQUEIDENTIFIER` generated by the DB (`NEWSEQUENTIALID()`), returned by `POST /create`/`POST /product`, never client-supplied. See [database](database.md).
- **ADO.NET** — .NET's low-level data access API (`SqlConnection`/`SqlCommand`/`SqlDataReader`); this project uses it directly against stored procedures, with no ORM (no Entity Framework) in between.
- **Stored-proc result convention** — every mutating stored procedure returns a `(Result INT, Message NVARCHAR)` row: `Result = 0` means success, any nonzero value is the HTTP status the API should return. See [api](api.md).
- **`.sqlproj` / `.dacpac`** — the DB schema is an SSDT SQL Server Database Project (`.sqlproj`), which builds to a `.dacpac` (a schema snapshot) that `sqlpackage` diffs against the live database and publishes. Not migration scripts. See [build-and-run](build-and-run.md).
- **PBKDF2** — Password-Based Key Derivation Function 2; the password-hashing algorithm used here (SHA-256, 100k iterations, per-user salt). See [api](api.md).
- **JWT / Bearer token** — the API issues a signed JSON Web Token on login; the client sends it back as `Authorization: Bearer <token>` on every subsequent request. Stateless — no server-side session store. See [api](api.md).
- **SSR / hydration** — the Angular app renders server-side first (via `@angular/ssr`, an Express server), then "hydrates" in the browser to become interactive. Relevant because SSR's HTTP calls run through Node, not the browser — see [build-and-run](build-and-run.md).
- **MTP (Microsoft Testing Platform)** — the newer .NET test-running infrastructure that xUnit v3 requires on the .NET 10 SDK, in place of the older VSTest pipeline. See [api](api.md).
- **`sessionStorage`** — where the Angular app keeps the JWT client-side; cleared automatically when the browser tab closes (as opposed to `localStorage`, which would persist across sessions).

## Other references in this repo

- `README.md` (repo root) — the human-facing overview; covers the same architecture at a lighter level and is the place to send someone who isn't going to read `ai_docs/`.
- `Documentation/Diagrams/` — the three sketches described above. `Documentation/PDF/Customer_Management_System_Documentation.pages` is further legacy design material from the same original pass; not re-verified against the current code, so treat it the same way — background context, not a source of truth.
- `API/Postman/` — a Postman collection for manual API testing.
