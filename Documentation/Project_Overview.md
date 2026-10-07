# Customer Management System — Project Overview

## What is it?

The Customer Management System is a web application for a shop owner (called the **merchant** in the app) to keep track of their customers, the products they sell and the purchases that connect the two.

After signing in, the merchant can:

- add, look up, edit, deactivate and delete customers;
- browse a catalogue of 50 products (laptops, monitors and more) with prices, stock levels and warehouses;
- record a purchase for a customer and see who bought what;
- look at a charts page that shows who the customers are and what sells;
- read a full history (audit log) of every change made to a customer;
- export the customer list to a CSV file for use in Excel.

It runs on your own computer: a web page in the browser, a server program behind it, and a database that holds all the records.

## Why it exists

I built this to learn a complete, realistic Angular + .NET + SQL Server stack from start to finish, instead of following a tutorial. Since then it has become my testbed: whenever a new Angular or .NET feature comes out, or I want to try a different way of doing something, I try it here first. Its two siblings, the **Employee Management System** and the **Imalo Education Webapp**, follow the same structure and conventions, so whatever works here carries over to them.

---

## The big picture

The app is made of three separate parts that only talk to each other over the network:

```
┌──────────────────────┐   HTTPS + JSON     ┌──────────────────────┐   stored procedures   ┌──────────────────────┐
│  Angular UI          │ ─────────────────► │  ASP.NET Core API    │ ────────────────────► │  SQL Server          │
│  (what you see)      │ ◄───────────────── │  (the rules)         │ ◄──────────────────── │  (the data)          │
│  localhost:4204      │   login token in   │  localhost:7145      │                       │  Docker, port 1433   │
└──────────────────────┘   every request    └──────────────────────┘                       └──────────────────────┘
```

1. **The UI** (user interface) is what the merchant sees in the browser: forms, tables, charts and buttons.
2. **The API** receives requests from the UI, checks that the merchant is signed in and that the data makes sense, then asks the database to read or write.
3. **The database** stores everything: customers, addresses, products, purchases, the audit log and the merchant account.

Because the three parts are separate, any one of them can be replaced without touching the others, as long as the messages between them stay the same.

---

## The building blocks

### 1. The UI — `src/UI/`

An **Angular 22** single-page application. The browser loads it once, and from then on pages change without full reloads.

What's in it:

| Area | What it does |
|---|---|
| Login page | Exchanges the merchant's username and password for a login token. |
| Customer list | A table with search, sorting and paging, 50 rows per page. Bulk actions let you select many customers and deactivate or delete them in one go. |
| Customer details | The customer's record, their purchases and their audit trail. |
| Add / edit customer | Forms with validation. A warning appears if you try to leave with unsaved changes. |
| Products | The catalogue, a details page per product (sold / in stock / left, and who bought it), and a form to add new products. |
| Charts | KPIs (key numbers) at the top, then charts about the customer base and about sales. |
| Audit log | Every change made in the app, newest first. |
| About | A switch to log API calls to the browser console, and a button that generates 50 random test customers with purchases. |

Some details worth knowing:

- **Server-side rendering (SSR):** the first page is rendered by a small Node/Express server, so you get HTML straight away rather than a blank page while JavaScript loads. Most pages are rendered ahead of time at build time; pages that depend on an ID in the URL (such as a single customer) are rendered on request.
- **Signals and "zoneless":** the UI uses Angular's newer reactive model (signals) instead of the older zone.js-based change detection. In practice this means the page updates exactly the parts that changed.
- **Charts are hand-made:** there is no charting library. Bars, lines and donuts are drawn as SVG by the app's own components, which keeps the bundle small and gives full control over how they look.
- **Health banner:** every 15 seconds the UI checks if the API is up, and shows an "API is not running" message if it isn't.

### 2. The API — `src/API/CustomerManagementSystemApi/`

An **ASP.NET Core Web API** on **.NET 10**. It is split into four projects, each with one job:

| Project | Job |
|---|---|
| `WebAPI` | The front door. Receives HTTP requests, checks the login token, applies rate limiting, and turns results into HTTP responses. Contains the controllers and `Program.cs`, where everything is wired together. |
| `BusinessLogic` | The rules. One small class (a "handler") per action, such as "create customer" or "record purchase". Validates input, writes the audit log, checks passwords and issues login tokens. |
| `DataAccess` | Talks to SQL Server. Each method calls exactly one stored procedure and turns the rows it gets back into C# objects. |
| `Domain` | The shared vocabulary: the shapes of a customer, a product, a purchase, plus the status codes and field lengths. |

There is also a `Tests` project with unit and in-memory API tests, and a **Postman** collection in `src/API/Postman/` for calling the API by hand.

The arrows only point one way: `WebAPI` → `BusinessLogic` → `Domain`, and `DataAccess` → `BusinessLogic`. The business rules never know they're being called over HTTP, and they never know the data comes from SQL Server. An automated test checks that these boundaries hold.

### 3. The database — `src/DB/CustomerManagement/`

A **SQL Server** database, defined as an SSDT project (a Visual Studio-style database project made of `.sql` files).

| Table | Holds |
|---|---|
| `Customer` | Name, email, phone, gender, birth date, status, enrollment date, timestamps. |
| `CustomerAddress` | One address per customer. |
| `Product` | Name, category, description, price, initial stock, current stock, warehouse. |
| `CustomerPurchase` | Which customer bought which product, and when. |
| `CustomerAuditLog` | Who did what to which customer, and when. |
| `Merchant` | The login account: username, hashed password, salt and role. |

All reading and writing goes through **stored procedures** (named SQL routines such as `Customer_List`, `Customer_Update` or `CustomerPurchase_Create`). The API never sends free-form SQL.

A lot of the business rules live in these procedures, because that is where they can be enforced safely in one transaction. For example: a customer must be deactivated before they can be deleted, the same email can't be used twice, and a product can't be sold when it's out of stock.

When the app is deployed, two seed scripts add the test merchant account and the 50-product catalogue.

---

## How the pieces talk to each other

### Signing in

1. The merchant enters a username and password on the login page.
2. The UI sends them to `POST /api/authentication/access-token`.
3. The API reads the stored password hash and salt from the database, hashes the typed password the same way, and compares the two.
4. If they match, the API creates a **JWT** (JSON Web Token), a signed piece of text that says "this is TestMerchantID, role 1801, valid for 15 minutes".
5. The UI keeps the token in the browser's session storage. From then on it attaches the token to every API call in the `Authorization` header.
6. Before each page loads, the UI asks the API whether the token is still valid. If it isn't, the merchant is sent back to the login page with a "session expired" message.

### A typical request: editing a customer

```
Edit form ──► CustomerService (UI) ──► PATCH /api/customer/update
                                              │
                                              ▼
                                     CustomerController (WebAPI)
                                              │
                                              ▼
                                     UpdateCustomerHandler (BusinessLogic)
                                       • checks each field (email format, phone digits, …)
                                              │
                                              ▼
                                     CustomerRepository (DataAccess)
                                       • EXEC Customer_Update @…
                                              │
                                              ▼
                                     SQL Server returns (Result, Message)
                                              │
                                              ▼
                                     Audit log entry "Edited" is written
                                              │
                                              ▼
                     UI shows a "saved" message and updates the row in the list
```

### What goes over the wire

- **Format:** JSON, with camelCase field names that mirror the database columns (`firstName`, `enrollmentDate`, …).
- **Successful responses** are wrapped in a small envelope: `{ status, responseMessage, data }`.
- **Errors** follow the standard "Problem Details" format (RFC 9457), so the UI always knows where to find the error message. A wrong field gives `400`, an unknown customer `404`, a duplicate email `409`, too many login attempts `429`.
- **Every stored procedure that changes data** returns one row: `(Result, Message)`. `0` means success; anything else is the HTTP status code to send back. This keeps the rules and their error codes in one place.

### Lists, paging and search

Search, sort and paging all happen in SQL. The browser only ever receives the 50 rows of the current page plus a total count. Typing in the search box waits 300 ms before sending the request, so it doesn't fire on every keystroke.

### Charts

The API sends one anonymous row per customer (status, gender, birth date, enrollment date, county, number of purchases) plus monthly sales figures. All the grouping and counting is done in the browser. That way a new chart rarely needs a change to the API or the database.

---

## Packages and tools, and why they're used

### UI

| Package | Why |
|---|---|
| `@angular/*` (core, router, forms, common, cdk) | The framework itself, routing between pages, and Signal Forms for the customer and product forms. |
| `@angular/ssr`, `@angular/platform-server`, `express` | Server-side rendering and prerendering of pages. |
| `bootstrap` | Base styling and layout. The app's own look is layered on top in `styles.css`. |
| `rxjs` | Handles streams of events, such as HTTP calls and debounced search. |
| `vitest`, `jsdom` | Unit tests that run in Node with a fake browser DOM. |
| `eslint`, `angular-eslint`, `prettier` | Code style checks and automatic formatting. |

### API

| Package | Why |
|---|---|
| `Microsoft.AspNetCore.Authentication.JwtBearer` | Checks the login token on every request. |
| `Microsoft.IdentityModel.JsonWebTokens` | Creates the login token. |
| `Microsoft.Data.SqlClient` | Connects to SQL Server and runs the stored procedures (plain ADO.NET, no ORM). |
| `Microsoft.AspNetCore.OpenApi`, `Swashbuckle.AspNetCore.SwaggerUI` | Generates the API description and the Swagger page for trying endpoints in the browser. |
| `Microsoft.Extensions.Options` / `Logging` / `DependencyInjection` | Configuration, logging and wiring the classes together. |
| `xunit.v3`, `Moq`, `Microsoft.AspNetCore.Mvc.Testing`, `NetArchTest.Rules` | Unit tests, fake repositories, in-memory API tests, and the test that checks the project boundaries. |

### Database and tooling

| Tool | Why |
|---|---|
| **Azure SQL Edge** (Docker image) | A SQL Server that runs on Apple Silicon Macs. Regular SQL Server has no ARM build. |
| **SSDT / `Microsoft.Build.Sql`** | The schema lives as plain `.sql` files in source control and builds into a `.dacpac` package. |
| **`sqlpackage`** | Compares the `.dacpac` with the live database and applies only the differences. |
| **Docker Desktop** | Runs the database container. |

---

## Security, in short

- **Passwords** are never stored as plain text. Each one is hashed with PBKDF2-SHA256 (100,000 rounds) and its own random salt. The check takes the same amount of time whether the username exists or not, so an attacker can't use timing to guess valid usernames.
- **Login tokens** last 15 minutes and are signed with a secret key, so they can't be forged or edited.
- **Login attempts** are limited to 5 per minute per IP address.
- **CORS** only allows the UI's own address to call the API from a browser.
- **SQL parameters** are always typed and never glued into SQL text, which rules out SQL injection.
- Clearing the global audit log requires the merchant role (`1801`).

---

## Setting it up (for future me)

### What you need installed

- .NET 10 SDK (pinned in `global.json`)
- .NET 8 SDK (the database project pins it in `src/DB/CustomerManagement/global.json`; don't remove it)
- Node.js 22, 24 or 26 with npm
- Docker Desktop
- A trusted dev certificate, once per machine: `dotnet dev-certs https --trust`

### Run everything

```bash
./run.sh
```

This one script:

1. starts Docker if it isn't running, then starts (or creates) the `sqlserver` container;
2. installs `sqlpackage` if it's missing, builds the database project and publishes it, retrying until SQL Server is ready;
3. starts the API at `https://localhost:7145` and waits until it answers;
4. exports the dev certificate so Node (used for SSR) trusts the API's HTTPS;
5. starts the UI at `http://localhost:4204` and opens it in the browser.

`Ctrl+C` stops the API and the UI. The database container keeps running.

**Test login:** `TestMerchantID` / `Merchant123`

### Build and test everything without starting anything

```bash
./build.sh             # add --skip-tests to skip the test runs
```

It builds the API with warnings treated as errors, checks formatting, runs the .NET tests, builds the database project, then installs, lints, builds and tests the UI.

### Useful addresses

| What | Where |
|---|---|
| UI | `http://localhost:4204` |
| API | `https://localhost:7145` |
| Swagger (API playground) | `https://localhost:7145/swagger` |
| Health check | `https://localhost:7145/health` |
| Database | `localhost,1433`, database `CustomerManagement`, user `sa` |
| Logs from `run.sh` | `.run/` |

### Where to change things

| To change… | Look in… |
|---|---|
| API settings (JWT key, token lifetime, CORS, connection strings) | `src/API/.../CustomerManagementSystem.WebAPI/appsettings.json` |
| The API address the UI calls, and the email/phone patterns | `src/UI/src/environments/environment.ts` |
| Tables or stored procedures | `src/DB/CustomerManagement/Tables/` and `StoredProcedures/` |
| Seed data (test merchant, products) | `src/DB/CustomerManagement/Scripts/PostDeployment/` |
| Database password, port, container name | Environment variables read by `run.sh`: `SQL_SA_PASSWORD`, `SQL_PORT`, `SQL_CONTAINER_NAME`, … |

A new column has to be added in four places: the table, the stored procedure parameter, `FieldLengthConstants` in the API, and the typed SQL parameter in the repository.

---

## Decisions and why I made them

- **Stored procedures, no ORM.** I wanted to really learn SQL Server: transactions, constraints, indexes and query plans. Keeping the SQL in procedures also means the important rules (lifecycle, stock, uniqueness) are enforced inside a database transaction, where two requests can't slip past each other.
- **Three separate parts, talking only over HTTP.** This mirrors how real systems are built, and lets me swap or rewrite one layer at a time. Over the years the UI moved from NgModules to standalone components and signals without the API noticing.
- **The schema as code (SSDT + `sqlpackage`).** There are no migration scripts. The `.sql` files describe what the database *should* look like, and `sqlpackage` works out how to get there. A fresh machine and an existing database are set up the same way.
- **Azure SQL Edge in Docker.** It's the only SQL Server flavour that runs natively on an Apple Silicon Mac. On Windows, the API falls back to a local SQL Server if Docker doesn't answer within 3 seconds.
- **A single `sqlserver` container for three apps.** The customer, employee and Imalo apps each have their own database inside the same container, so only one SQL Server runs at a time.
- **"Deactivate before delete".** An active customer can't be deleted in one click. It has to be deactivated first, which protects against accidents. Test customers made by the generator skip this rule so they're easy to clean up.
- **The audit log has no foreign key to the customer.** That way the history of a deleted customer survives the delete.
- **Charts without a library.** Building them by hand was a good exercise in SVG and accessibility, and keeps the app light. The same chart components are shared, file for file, with the employee and Imalo apps.
- **Status codes as numbers** (`1901` active, `1903` deactivated, `1904` test; role `1801`). They're checked by the database and kept identical across the sibling apps, so the same code means the same thing everywhere.

---

## Interesting bits

- **Revenue on the charts is calculated at today's prices.** The price paid at purchase time isn't stored, so the charts multiply each sale by the product's *current* price.
- **Re-activating a test customer keeps them a test customer.** When a customer is deactivated, their previous status is saved, and reactivating restores exactly that.
- **"Reset products (demo)"** puts every product back to its starting stock while keeping the purchase history, so the demo can be replayed.
- **The test-data generator** spreads purchases realistically between each customer's enrollment date and today, so the "growth over time" charts look meaningful.
- **Everything is accessible:** one heading per page, charts you can explore with the keyboard, with tooltips that screen readers announce, and all animations switch off for people who've asked their system for reduced motion.
- **Early diagrams** of the login flow, JWT security and overall flow are in `Documentation/Diagrams/`. They're from before the move to .NET 10 / Angular 22, so a few names have changed, but the overall idea is the same.

## Glossary

| Term | Meaning |
|---|---|
| Merchant | The person signed in to the app. |
| Customer | A record the merchant manages. |
| Status | `1901` active, `1903` deactivated, `1904` test. |
| Depot | What the UI calls a product's warehouse. |
| Sold / in stock / left | `sold = initial quantity − quantity on hand`. |
| JWT | The signed login token the UI sends with every request. |
| Stored procedure | A named SQL routine stored in the database, called by the API. |
| `.dacpac` | The compiled database project, ready to be published by `sqlpackage`. |

For deeper, per-layer technical notes see [`ai_docs/`](../ai_docs/index.md), and for the full architecture write-up see [`ARCHITECTURE_AND_DESIGN.md`](../ARCHITECTURE_AND_DESIGN.md).
