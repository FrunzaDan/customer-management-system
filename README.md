# Customer Management System

Customer Management System is a full-stack web app that lets a merchant manage customer records, a product catalogue and the purchases that connect them. The merchant signs in with a username and password, and every request after that is authorized with a short-lived JWT. The app is split into three parts that only talk over the network: an Angular UI, an ASP.NET Core Web API, and a SQL Server database that is accessed only through stored procedures. I built it to learn a complete Angular + .NET + SQL Server stack end to end instead of following a tutorial. It has since become my testbed for new patterns, and it has moved from NgModules and zone.js to signals and zoneless change detection, and from an unsalted password hash to salted PBKDF2.

---

## Key Features

- **Secure login:** The merchant exchanges a username and password for an HMAC-SHA256 JWT that expires after 15 minutes. Passwords are stored as salted PBKDF2 hashes (100k iterations) and compared in constant time, and the login endpoint is rate-limited to 5 attempts per minute per IP to slow down guessing.
- **Customer lifecycle:** Customers can be created, viewed, edited, deactivated, reactivated and deleted. An active customer must be deactivated before it can be deleted, so a record can't disappear by accident in one click.
- **Server-side list handling:** Search, sort and pagination run in SQL, so the browser only receives the rows on the current page. Bulk actions split a selection by status, deactivating the active customers and deleting the inactive ones after a single confirmation.
- **Products and purchases:** The database is seeded with 50 products (laptops, monitors and more), each with a price, stock level and warehouse. You can add products, record purchases for a customer, see each product's sold / in stock / left counts and who bought it, and reset stock to its starting level.
- **Audit log:** Every create, edit, deactivate, reactivate and delete is logged with who did it and when. Each customer has their own history, and a global log shows everything; clearing the global log needs the Merchant role.
- **Charts and CSV export:** A charts page shows who the customers are, how the customer base has grown and what sells. The charts are the app's own SVG components, with no chart library. The customer list can be exported to CSV with the current filters and sort order applied.
- **Test data generator:** The About page adds 50 demo customers with random purchases, so the lists and charts have something to show. Test customers skip the deactivate-before-delete rule, so they're easy to clean up.
- **API health banner:** The UI polls the API's `/health` endpoint and shows an "API is not running" message when the backend is down, instead of failing silently.
- **One-command scripts:** `run.sh` brings up the whole stack: the SQL Server container in Docker, the schema deployment, the API and the Angular dev server. `build.sh` builds and tests every layer (API, database project, UI) without starting any services, as a check before committing.

---

## Tech Stack

- **Frontend:** Angular 22.2 (standalone components, signals, zoneless), SSR via `@angular/ssr` + Express, Bootstrap 5, TypeScript
- **Backend:** ASP.NET Core Web API on .NET 10 (controllers), layered as WebAPI → BusinessLogic → DataAccess → Domain
- **Database / Storage:** SQL Server (Azure SQL Edge in Docker), ADO.NET with stored procedures only (no ORM), SSDT project deployed with `sqlpackage`
- **Tooling & Other:** OpenAPI + Swagger UI, xUnit v3 + Moq (Microsoft Testing Platform), Vitest + jsdom, ESLint (angular-eslint), Prettier, .NET analyzers (latest-recommended) + dotnet format, Postman collection

---

## Prerequisites

Before running this project, ensure you have the following installed:

- .NET 10 SDK (10.0.401 or newer, pinned in `global.json`)
- .NET 8 SDK (the database project's `src/DB/CustomerManagement/global.json` pins it for the SQL build tooling)
- Node.js `^22.22.3`, `^24.15.0` or `>=26` with npm
- Docker Desktop (runs the SQL Server container)
- A trusted ASP.NET Core dev certificate: `dotnet dev-certs https --trust` (once per machine)

`sqlpackage` is installed automatically as a global dotnet tool by `run.sh` if it is missing.

---

## Local Setup & Running

### 1. Clone the repository

```bash
git clone https://github.com/FrunzaDan/customer-management-system.git
cd customer-management-system
```

### 2. Configuration

Everything works out of the box for local development. The relevant settings live in `src/API/CustomerManagementSystemApi/CustomerManagementSystem.WebAPI/appsettings.json`:

- `ConnectionStrings:Docker` points at the container on `localhost,1433`. On Windows, the API falls back to `ConnectionStrings:LocalSqlServer` (Windows auth) if Docker doesn't answer within 3 seconds.
- `Auth` holds the JWT key, issuer, audience and token lifetime. The key is a placeholder for local use only.
- `Cors:AllowedOrigins` allows the Angular dev server on port 4204.

`run.sh` reads these environment variables if you need to override the defaults: `SQL_SA_PASSWORD`, `SQL_PORT`, `SQL_CONTAINER_NAME`, `SQL_IMAGE`, `SQL_PLATFORM` (defaults to `linux/arm64` on Apple Silicon and `linux/amd64` elsewhere), `SQL_DATABASE` and `API_URL`. It passes the resulting connection string to the API, so a changed port or password doesn't need an `appsettings.json` edit. Its logs (API output, `sqlpackage` output) go to `.run/`.

### 3. Installation & Run

```bash
./run.sh
```

This starts Docker if needed, creates or starts the `sqlserver` container, builds and publishes the database schema, starts the API in the background on `https://localhost:7145`, and then runs the Angular dev server in the foreground on `http://localhost:4204` and opens it in your browser. `Ctrl+C` stops the API and Angular; the database container keeps running.

Log in with the seeded test account:

```
Merchant ID: TestMerchantID
Password:    Merchant123
```

To build and test everything without starting any services:

```bash
./build.sh
```

That restores and builds the .NET solution with warnings treated as errors, checks it with `dotnet format --verify-no-changes`, runs the xUnit tests, and builds the SQL project. For the UI it runs `npm ci`, the Prettier check, ESLint, the production build and the Vitest suite. Pass `--skip-tests` to skip both test steps.

---

## Database & Migrations

There are no EF migrations. The schema is an SSDT project in `src/DB/CustomerManagement` (tables, stored procedures and post-deployment seed scripts). `run.sh` builds it into a `.dacpac` and publishes it with `sqlpackage`, which diffs the target database and applies only the changes.

The post-deployment scripts seed the test merchant and the 50-product catalogue. To start the container by hand instead of through `run.sh`:

```bash
docker run -e "ACCEPT_EULA=1" -e "MSSQL_SA_PASSWORD=MyStrongPassw0rd?" \
  -p 1433:1433 --name sqlserver -d mcr.microsoft.com/azure-sql-edge
```

Azure SQL Edge is used because it has an arm64 image that runs on Apple Silicon. The same `sqlserver` container is shared with the Employee Management and Imalo apps; each app has its own database.

---

## API / App Usage

Swagger UI is available at `https://localhost:7145/swagger` in Development. Use the bearer-token scheme there to paste in a token from the login call. There is also a Postman collection in `src/API/Postman/`.

| Area | Routes |
|---|---|
| Auth | `POST api/authentication/access-token` (rate-limited), `GET api/authentication/verify-token` |
| Customers | `POST create`, `GET get`, `GET all`, `GET export`, `PATCH update`, `PATCH deactivate`, `PATCH reactivate`, `DELETE delete`, all under `api/customer/` |
| Purchases & insights | `GET api/customer/purchases`, `POST api/customer/purchase`, `GET api/customer/insights` |
| Audit log | `GET api/customer/audit-log`, `GET api/customer/audit-log/all`, `DELETE api/customer/audit-log/all` (needs the Merchant role, `1801`) |
| Products | `GET all`, `GET get`, `POST create`, `POST reset-stock`, all under `api/product/` |
| Health | `GET /health` |

Every route except login and health requires a bearer token. Errors come back as RFC 9457 Problem Details.

---

## License & Notes

Personal learning project with no license file. Ask before reusing any of it.

- Logging out only clears the token from browser session storage. There is no server-side token revocation.
- Bulk delete in the UI loops over the single-customer endpoints rather than calling a bulk API.
- Architecture diagrams are in `Documentation/Diagrams/`. They predate the .NET 10 / Angular 22 rewrite, so some details have moved on.
- More detailed technical notes per layer are in [`ai_docs/`](ai_docs/index.md).
