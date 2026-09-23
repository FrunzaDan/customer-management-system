# Customer Management System

A small CRUD app for a merchant to manage their customer records — names, contact details, addresses, the usual. I built it to actually learn a full stack end to end rather than follow a tutorial: Angular on the front, a .NET Web API in the middle, SQL Server on the back, with a real JWT login instead of a fake one.

It's not trying to be a product. It's the project I keep coming back to whenever I want to try out something new — it went from Angular with NgModules and zone.js to a fully zoneless, signals-based app, from an unsalted password hash to PBKDF2 with rate limiting on the login endpoint, and from browser-native `confirm()` popups to a custom animated confirmation dialog, all as separate learning passes over time.

### Contents

[Stack](#stack) · [What it does](#what-it-does) · [Architecture](#architecture) · [Project layout](#project-layout) · [Running it locally](#running-it-locally) · [Building and testing](#building-and-testing) · [API](#api) · [Things left alone](#things-ive-deliberately-left-alone) · [More documentation](#more-documentation)

## Stack

| Layer | Tech                                                                            | Where                              |
| ----- | ------------------------------------------------------------------------------- | ---------------------------------- |
| UI    | Angular 22, signals, zoneless change detection, SSR via `@angular/ssr`          | `UI`                               |
| API   | ASP.NET Core Web API on .NET 10, C#                                             | `API/CustomerManagementSystemApi`  |
| DB    | SQL Server (SSDT project, built to a `.dacpac` and published with `sqlpackage`) | `DB/CustomerManagement` |

Nothing shares process or memory — the three layers only ever talk over HTTP(S)/TCP, so each one can be run, tested, and reasoned about on its own.

## What it does

- Merchant login, JWT-secured — every API call after login carries a bearer token.
- Register, view, edit, deactivate/reactivate, and delete customers, with a proper lifecycle (a customer has to be deactivated before it can be deleted — no skipping straight to delete on an active record).
- Server-side search, sort, and pagination on the customer list — the DB does the filtering, not the browser.
- Bulk actions from the customer list: select a batch of rows and the app splits them by status, deactivating the active ones and deleting the rest, in one confirmation.
- Per-customer and global audit log (created/edited/deactivated/reactivated/deleted, who did it, when).
- Product catalogue (50 fixed tech products) with per-customer purchases on the customer details page, and a Products tab showing sold / inventory / left and which customers bought each product, and when.
- CSV export of the current filtered/sorted list.
- A "test customer" mode (seeded from the About page) for generating throwaway demo data that's exempt from the usual deactivate-before-delete rule.
- A live "API is not running" banner in the UI, backed by a `/health` endpoint the app polls.

## Architecture

Two hops, one direction: **Angular UI → ASP.NET Core Web API → SQL Server**, over HTTPS then ADO.NET. Inside the API solution it's layered the same way — `WebAPI` (controllers, the thin presentation layer) calls into `BusinessLogic` (validation, JWT issuing, the actual customer/merchant logic), which calls `DataAccess` (`DbUtils.cs`, plain ADO.NET `SqlCommand`/`SqlDataReader`), which calls SQL Server **stored procedures only** — no ORM, no inline SQL anywhere. `Domain` sits underneath all of it holding the models and config interfaces the other three share.

Three sketches from the original design, still a decent map of how the pieces connect:

**Overall flow** — how the UI, API, and DB talk to each other, and what sits inside the API solution (controllers → business logic → data access → stored procedures).

![General flow](Documentation/Diagrams/CMS_General_Flow.PNG)

**JWT security** — how a login turns into a signed token, and how every later request gets validated against it.

![JWT security](Documentation/Diagrams/CMS_Security_JWT.PNG)

**Login walkthrough** — the concrete request/response sequence for signing in and landing on an authenticated page.

![Login process](Documentation/Diagrams/CMS_Login_Process.PNG)

These are hand-drawn from before the .NET 10 / Angular 22 rewrite, so the overall shape — UI → API → DB, stored procedures only, one JWT validation path — still holds, but a few specifics have since moved on:

- The JWT diagram shows a separate `JwtValidation.cs` doing its own checks — that class was dead code and has been deleted; validation now happens in exactly one place, the `AddJwtBearer` middleware.
- The merchant password hash shown as plain `SHA2_256` predates the later switch to salted PBKDF2 (see [API](#api) below).
- The login diagram's `app-routing.module` predates Angular going standalone/zoneless — routing is now `app.routes.ts` and component state is signals, not fields watched by `zone.js`, but the guard → verify-token → endpoint sequence it draws is otherwise still accurate.

`ai_docs/index.md` has the same architecture summary kept current as the code changes — prefer it over these pictures where the two disagree.

## Project layout

```
Customer_Management_System/
├── build.sh              # restore + build + test everything, no live services
├── run.sh                # start the DB container, deploy schema, run API + Angular
├── API/
│   ├── Postman/                                     # collection for manual API testing
│   └── CustomerManagementSystemApi/
│       ├── CustomerManagementSystem.WebAPI/         # ASP.NET Core host, controllers, appsettings
│       ├── CustomerManagementSystem.BusinessLogic/  # services, JWT, validation rules
│       ├── CustomerManagementSystem.DataAccess/     # ADO.NET, stored-proc calls, password hashing
│       ├── CustomerManagementSystem.Domain/         # models, config interfaces
│       └── CustomerManagementSystem.Tests/          # xUnit v3 unit tests
├── DB/CustomerManagement/
│   ├── Tables/                    # Customer, CustomerAddress, Merchant, CustomerAuditLog, Product, CustomerPurchase
│   ├── StoredProcedures/          # <Entity>_<Verb> — all data access goes through these, no ORM, no inline SQL
│   └── Scripts/PostDeployment/    # seeds a test merchant login
└── UI/
    └── src/app/
        ├── components/            # one folder per route/view
        └── services/              # HTTP calls, auth guard, session storage
```

## Running it locally

You'll need Docker, the .NET 10 SDK, and Node (with npm). Everything else — the SQL Server instance, schema, API, and Angular dev server — is handled by the scripts.

```bash
./run.sh
```

That will:

1. Start Docker Desktop if it isn't already running, and bring up a SQL Server container (Azure SQL Edge — the only Microsoft SQL image that has a working arm64 build, which matters on Apple Silicon).
2. Build and publish the DB schema to it.
3. Start the API in the background (`https://localhost:7145`) and wait for it to come up.
4. Trust the API's dev TLS cert for Node, so Angular's server-side rendering can actually call it.
5. Start the Angular dev server in the foreground (`http://localhost:4203`).

`Ctrl+C` stops both the API and Angular; the DB container keeps running so the next `./run.sh` is fast.

Log in with the seeded test merchant:

```
Merchant ID: TestMerchantID
Password:    Merchant123
```

One bit of one-time setup `run.sh` doesn't do for you: trusting the local ASP.NET Core dev certificate at the OS level —

```bash
dotnet dev-certs https --trust
```

If you hit `ERR_CERT_AUTHORITY_INVALID` in the browser after that, don't re-run `--export-path` to "refresh" the cert — it actually regenerates a new one and makes things worse. Run `dotnet dev-certs https --clean && dotnet dev-certs https --trust` instead.

## Building and testing

```bash
./build.sh
```

Restores and builds the .NET solution, runs the xUnit test suite, builds the SQL project, then does `npm ci` + `npm run build` + `ng test` for the Angular app. No Docker or live services involved — it's the "does everything still compile and pass" check, meant to run before committing.

A couple of things worth knowing if you poke at the tests directly:

- The API tests run on xUnit v3 against the .NET 10 SDK, which needs the Microsoft Testing Platform runner rather than the older VSTest pipeline — that's what the root `global.json` is for.
- The Angular tests run on Vitest (`ng test`), not Karma — the project was set up that way from the start.
- .NET coverage: `BusinessLogic` (validations, JWT creation, auth, customer register/edit/get/activate/delete) and `DataAccess`'s password hasher — all pure logic, no live DB or Docker needed. `DbHelper`'s `SqlDataReader`-based row mapping is the one piece left untested (it takes a concrete reader, not an interface, so exercising it would need a live connection or a structural change); it's covered manually today via Postman/Swagger and the app actually running.
- Angular coverage leans toward the security/session chain — session storage, the auth HTTP interceptor, the route guard, token verification, login — plus the customer list's sort/paging/search logic and the activate/deactivate/delete services. Forms and a few other components still don't have specs.

## API

All customer/merchant data access goes through stored procedures — no ORM, no inline SQL. Swagger is available in Development mode with a bearer-token scheme wired in, so you can paste a token in and try endpoints by hand. There's also a Postman collection in `API/Postman/` if you'd rather test that way.

Auth is a straightforward username/password → JWT exchange: HMAC-SHA256 signed, 15-minute expiry, validated in exactly one place in the middleware pipeline. Passwords are hashed with PBKDF2 (SHA-256, 100k iterations, per-user salt) and compared in constant time. The login endpoint is rate-limited per IP.

## Things I've deliberately left alone

This is a learning project, so a few rough edges are intentional rather than unfinished:

- The JWT signing key in `appsettings.json` is a placeholder — fine for local use, not something to reuse as-is anywhere real.
- There's no server-side token revocation. A token is valid until it naturally expires; logging out just clears it from the browser's session storage.
- Only one merchant role exists right now, though the plumbing (JWT role claim, `[Authorize(Roles = ...)]`) is already there for a second one.
- Bulk delete on the customer list is a client-side loop over the existing single-customer endpoints, not a dedicated bulk API — same rules apply, just batched with one confirmation prompt.

## More documentation

The `ai_docs/` folder has denser, more technical write-ups of each layer — start at [`ai_docs/index.md`](ai_docs/index.md), or go straight to [`api.md`](ai_docs/api.md), [`database.md`](ai_docs/database.md), [`angular-frontend.md`](ai_docs/angular-frontend.md), or [`build-and-run.md`](ai_docs/build-and-run.md).

## License

Personal project, no license file yet — ask if you want to use any of this.
