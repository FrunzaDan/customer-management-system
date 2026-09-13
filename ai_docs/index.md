# Customer Management System — AI Docs Index

> **Read this file first**, per `learning_approach.md` and `CLAUDE.md`. It orients and links out; details live in the four concept docs below so each layer can be taught, corrected, and updated independently.

## What this app is

A small full-stack CRUD app for a merchant to manage their customers' records (personal info + address); one of the author's first full-stack projects, built to learn the stack rather than to run in production.

| Layer | Folder | Tech |
|---|---|---|
| UI | `UI/customer_management_system` | Angular 22 (zoneless, signals, SSR via `@angular/ssr`/Express) |
| API | `API/Customer_Management_System_API` | .NET 10 / ASP.NET Core Web API, C# |
| DB | `DB/Customer_Management_System_DB` | SQL Server (SSDT `.sqlproj`, deployed via `sqlpackage`) |

```
Customer_Management_System/
├── build.sh              # restore + build + test .NET, then build Angular
├── run.sh                # start Docker DB, deploy schema, start API + Angular dev server
├── API/
│   ├── Postman/                                     # Postman collection for manual API testing
│   └── Customer_Management_System_API/
│       ├── CustomerManagementSystem.WebAPI/         # ASP.NET Core host: Program.cs, Controllers, appsettings.json
│       ├── CustomerManagementSystem.BusinessLogic/  # services, JWT creation, validation rules
│       ├── CustomerManagementSystem.DataAccess/     # ADO.NET, stored-proc calls, password hashing
│       ├── CustomerManagementSystem.Domain/         # models, config interfaces
│       └── CustomerManagementSystem.Tests/          # xUnit v3 unit tests (BusinessLogic + DataAccess, DB mocked out)
├── DB/Customer_Management_System_DB/
│   ├── Tables/                                  # tbl_customers, tbl_addresses, tbl_merchants
│   ├── Stored_Procedures/                       # usp_* — all data access goes through these
│   └── Post_Deployment_Scripts/                 # seeds the test merchant
└── UI/customer_management_system/
    └── src/app/
        ├── components/                          # one folder per route/view
        └── services/                            # HTTP calls, auth guard, session storage
```

- Three independently-runnable layers; nothing shares process or memory — they only talk over HTTP(S)/TCP.
- Data flows: Angular UI → HTTPS → ASP.NET Core API → ADO.NET (parameterized `SqlCommand`s, stored procedures only, no ORM) → SQL Server.
- Local dev DB runs as a **Docker container** (Azure SQL Edge — the only Microsoft SQL Server image with a working Apple Silicon/arm64 build). See [build-and-run](build-and-run.md).
- Legacy diagrams and a `.pages` doc from the original design live in `Documentation/Diagrams/` and `Documentation/PDF/` — still broadly accurate for the JWT/login flow, but written before the .NET 10 / Angular 22 modernization these docs describe. Prefer the concept docs below when they disagree.
- This is a learning project: some rough edges are deliberately left as-is rather than "fixed" — each doc below has a "Known gaps" section for its layer; don't treat those as an unclaimed TODO list.

## Documented Concepts

- [api](api.md) — ASP.NET Core request pipeline, controllers, validation, JWT auth, password hashing, xUnit v3 test setup, API-side known gaps.
- [database](database.md) — `tbl_customers`/`tbl_addresses`/`tbl_merchants` schema, stored procedures, status-code lifecycle, audit log, DB-side known gaps.
- [angular-frontend](angular-frontend.md) — app config/routing/auth guard, login flow, route/component map, services, Angular-side known gaps.
- [build-and-run](build-and-run.md) — Docker SQL Server, `build.sh`/`run.sh`, test login, TLS-trust gotchas.

Before exploring source directly, read the relevant doc above.

## Glossary

Domain terms and magic numbers used across this codebase — check here before assuming a number or acronym is arbitrary.

- **Merchant** — the API's authenticated principal; the user who logs in and manages customers. Stored in `tbl_merchants`. Not the same as a "customer."
- **Customer** — the record being managed (name, contact info, address). Stored in `tbl_customers` + `tbl_addresses`.
- **`customer_Status` codes** — `1901` = active, `1903` = deactivated, `1904` = test (fictitious customers created via the About page's bulk generator). See [database](database.md).
- **`merchant_role` codes** — `1801` = the only role currently in use. See [api](api.md).
- **GUID** — customer primary key, always server-generated (`Guid.NewGuid()`), never client-supplied. See [database](database.md).
- **ADO.NET** — .NET's low-level data access API (`SqlConnection`/`SqlCommand`/`SqlDataReader`); this project uses it directly against stored procedures, with no ORM (no Entity Framework) in between.
- **Stored-proc result convention** — every mutating stored procedure returns a `(result INT, message NVARCHAR)` row: `result = 0` means success, any nonzero value is the HTTP status the API should return. See [api](api.md).
- **`.sqlproj` / `.dacpac`** — the DB schema is an SSDT SQL Server Database Project (`.sqlproj`), which builds to a `.dacpac` (a schema snapshot) that `sqlpackage` diffs against the live database and publishes. Not migration scripts. See [build-and-run](build-and-run.md).
- **PBKDF2** — Password-Based Key Derivation Function 2; the password-hashing algorithm used here (SHA-256, 100k iterations, per-user salt). See [api](api.md).
- **JWT / Bearer token** — the API issues a signed JSON Web Token on login; the client sends it back as `Authorization: Bearer <token>` on every subsequent request. Stateless — no server-side session store. See [api](api.md).
- **SSR / hydration** — the Angular app renders server-side first (via `@angular/ssr`, an Express server), then "hydrates" in the browser to become interactive. Relevant because SSR's HTTP calls run through Node, not the browser — see [build-and-run](build-and-run.md).
- **MTP (Microsoft Testing Platform)** — the newer .NET test-running infrastructure that xUnit v3 requires on the .NET 10 SDK, in place of the older VSTest pipeline. See [api](api.md).
- **`sessionStorage`** — where the Angular app keeps the JWT client-side; cleared automatically when the browser tab closes (as opposed to `localStorage`, which would persist across sessions).

## Other references in this repo

- `Documentation/Diagrams/` and `Documentation/PDF/` — legacy diagrams, see above.
- `API/Postman/` — a Postman collection for manual API testing.
