# Customer Management System — Index

## What it is

A learning full-stack CRUD app: a merchant logs in and manages customer records, products and purchases.

## Key files / paths

| Layer | Folder | Tech |
|---|---|---|
| UI | `src/UI/` | Angular 22 (zoneless, signals, Signal Forms, SSR) |
| API | `src/API/CustomerManagementSystemApi/` | .NET 10 ASP.NET Core Web API, 4 projects + tests |
| DB | `src/DB/CustomerManagement/` | SQL Server, SSDT `.sqlproj` deployed with `sqlpackage` |

- `build.sh` — build and test everything; starts nothing.
- `run.sh` — start the Docker database, deploy the schema, then start the API and UI.
- `src/API/Postman/` — Postman collection for manual API calls.
- `Documentation/Diagrams/` — early sketches; the docs below win where they disagree.

## How it works

### Architecture

```
Browser ──► Angular dev server :4204 (SSR via Express in Node)
              │  JSON over HTTPS, Authorization: Bearer <jwt>
              ▼
           ASP.NET Core API :7145
             WebAPI (controllers, ApiControllerBase.Reply, GlobalExceptionHandler)
               → BusinessLogic (Features/*: one handler per action; Contracts; validation; JWT)
               → I*Repository (declared in BusinessLogic, implemented by DataAccess/Repositories:
                 StoredProcedureExecutor, ADO.NET, typed SqlParameters)
             Domain (read models, enums, field lengths) is shared by all three
              │  stored procedures only
              ▼
           SQL Server (Azure SQL Edge container "sqlserver" :1433, database CustomerManagement)
```

- **Result convention:** every mutating proc returns a `(Result, Message)` row. `Result = 0` means success; anything else is the HTTP status. The API wraps successes in `ResponseModel<T>` and turns every failure into RFC 9457 Problem Details.
- **Auth:** login returns a 15-minute JWT, kept in `sessionStorage`. The UI's `authGuard` verifies it before each protected route; an interceptor attaches it to every API call.

### A request end to end (editing a customer)

1. `update-customer` submits its Signal Form → `CustomerService.updateCustomer()` → `PATCH api/customer/update`.
2. `CustomerController` → `UpdateCustomerHandler` validates the fields (400 per field) → `ICustomerRepository` calls `Customer_Update`.
3. The proc's `(Result, Message)` row becomes a `ResponseModel`; `Reply()` returns it, or Problem Details for a non-success.
4. `CustomerAuditLogger` writes an `Edited` row (best-effort). The UI toasts, and the edit is written straight into the loaded list.

### Features

- login;
- customer CRUD with an active/deactivated/test lifecycle;
- a server-side paged, searchable and sortable list;
- bulk actions and CSV export;
- per-customer and global audit logs;
- products and purchases;
- a charts dashboard (KPIs, customer base, sales and catalogue);
- a test-data generator.

## Documented Concepts

- [api](api.md) — pipeline, configuration, database connection, errors, logging, endpoints, naming, JWT, tests.
- [database](database.md) — tables, procs, lifecycle, audit log, products and purchases, naming and data types.
- [angular-frontend](angular-frontend.md) — config, render modes, auth, routes, data loading, charts, forms, feedback, styling, tests.
- [build-and-run](build-and-run.md) — Docker SQL, `build.sh`/`run.sh`, test login, TLS trust.
- [learning_approach](learning_approach.md) — how these docs are written and grown.

### Where to look

| Question | Doc → section |
|---|---|
| Add or change an endpoint | api → Endpoints, Naming, Validation and data types |
| Add a column or proc | database → Naming and data types; api → Gotchas (the four places a column lives) |
| Why a request returned 4xx/5xx | api → Errors; database → Error handling |
| Add a page or chart | angular-frontend → Routes, Data loading, Charts |
| Something won't start | build-and-run → Gotchas |
| Code shared with the sibling apps | angular-frontend → Gotchas (shared files) |

## Glossary

- **Merchant** — the logged-in user (table `Merchant`). **Customer** — the managed record.
- **StatusCode** — `1901` active, `1903` deactivated, `1904` test.
- **RoleCode** — `1801`, the only role.
- **Depot** — the UI name for a product's warehouse (`Product.Warehouse`).
- **Sold / inventory / left** — `sold = InitialQuantity - QuantityOnHand`.

## Gotchas / conventions

- The sibling apps (employee-management-system, imalo-education-webapp) are kept aligned on purpose: names, data types, error handling, logging, the database connection, and a set of identical UI files. Ports: customer 4204/7145, employee 4205/7146, Imalo 4203/7244; all three share the `sqlserver` container.
- Rough edges noted under Gotchas are known and accepted, not a TODO list.
