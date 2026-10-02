# Customer Management System

A full-stack CRUD app for a merchant to manage customer records, products and purchases, behind a JWT login. I built it to learn an Angular + ASP.NET Core + SQL Server stack end to end, and I keep using it as the place to try out new patterns.

---

## 🚀 Key Features

- **JWT login:** Merchant sign-in issues a 15-minute HMAC-SHA256 token; passwords are hashed with salted PBKDF2 and the login endpoint is rate-limited per IP.
- **Customer lifecycle:** Create, view, edit, deactivate, reactivate and delete customers. An active customer must be deactivated before it can be deleted.
- **Server-side list handling:** Search, sort and pagination happen in SQL, not in the browser. Bulk actions deactivate or delete a selection in one go.
- **Products and purchases:** A seeded catalogue of 50 products, new products from the UI, per-customer purchases, and a product page showing stock and buyers.
- **Audit log:** Per-customer and global history of who created, edited, deactivated, reactivated or deleted what, and when.
- **Charts and CSV export:** An insights page for the customer base and sales, plus CSV export of the current filtered/sorted list.
- **Test data generator:** The About page can add a batch of demo customers with random purchases. Test customers skip the deactivate-before-delete rule.
- **API health banner:** The UI polls `/health` and shows an "API is not running" message when the backend is down.

---

## 🛠 Tech Stack

- **Frontend:** Angular 22.2 (standalone components, signals, zoneless), SSR via `@angular/ssr` + Express, Bootstrap 5, TypeScript
- **Backend:** ASP.NET Core Web API on .NET 10 (controllers), layered as WebAPI → BusinessLogic → DataAccess → Domain
- **Database / Storage:** SQL Server (Azure SQL Edge in Docker), ADO.NET with stored procedures only (no ORM), SSDT project deployed with `sqlpackage`
- **Tooling & Other:** OpenAPI + Swagger UI, xUnit v3 + Moq (Microsoft Testing Platform), Vitest + jsdom, Prettier, StyleCop/Roslynator analyzers, Postman collection

---

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

- .NET 10 SDK (10.0.401 or newer, pinned in `global.json`)
- .NET 8 SDK (the database project's `DB/CustomerManagement/global.json` pins it for the SQL build tooling)
- Node.js `^22.22.3`, `^24.15.0` or `>=26` with npm
- Docker Desktop (runs the SQL Server container)
- A trusted ASP.NET Core dev certificate: `dotnet dev-certs https --trust` (once per machine)

`sqlpackage` is installed automatically as a global dotnet tool by `run.sh` if it is missing.

---

## ⚙️ Local Setup & Running

### 1. Clone the repository

```bash
git clone https://github.com/FrunzaDan/customer-management-system.git
cd customer-management-system
```

### 2. Configuration

Everything works out of the box for local development. The relevant settings live in `API/CustomerManagementSystemApi/CustomerManagementSystem.WebAPI/appsettings.json`:

- `ConnectionStrings:Docker` points at the container on `localhost,1433`. On Windows, the API falls back to `ConnectionStrings:LocalSqlServer` (Windows auth) if Docker doesn't answer within 3 seconds.
- `Auth` holds the JWT key, issuer, audience and token lifetime. The key is a placeholder for local use only.
- `Cors:AllowedOrigins` allows the Angular dev server on port 4203.

`run.sh` reads these environment variables if you need to override the defaults: `SQL_SA_PASSWORD`, `SQL_PORT`, `SQL_CONTAINER_NAME`, `SQL_IMAGE` and `SQL_PLATFORM`.

### 3. Installation & Run

```bash
./run.sh
```

This starts Docker if needed, creates or starts the `sqlserver` container, builds and publishes the database schema, starts the API in the background on `https://localhost:7145`, and then runs the Angular dev server in the foreground on `http://localhost:4203`. `Ctrl+C` stops the API and Angular; the database container keeps running.

Log in with the seeded test account:

```
Merchant ID: TestMerchantID
Password:    Merchant123
```

To build and test everything without starting any services:

```bash
./build.sh
```

That restores and builds the .NET solution, runs the xUnit tests, builds the SQL project, then runs `npm ci`, the production build and the Vitest suite for the UI.

---

## 🗄 Database & Migrations

There are no EF migrations. The schema is an SSDT project in `DB/CustomerManagement` (tables, stored procedures and post-deployment seed scripts). `run.sh` builds it into a `.dacpac` and publishes it with `sqlpackage`, which diffs the target database and applies only the changes.

The post-deployment scripts seed the test merchant and the 50-product catalogue. To start the container by hand instead of through `run.sh`:

```bash
docker run -e "ACCEPT_EULA=1" -e "MSSQL_SA_PASSWORD=MyStrongPassw0rd?" \
  -p 1433:1433 --name sqlserver -d mcr.microsoft.com/azure-sql-edge
```

Azure SQL Edge is used because it has an arm64 image that runs on Apple Silicon. The same `sqlserver` container is shared with the Employee Management and Imalo apps; each app has its own database.

---

## 🔌 API / App Usage

Swagger UI is available at `https://localhost:7145/swagger` in Development. Use the bearer-token scheme there to paste in a token from the login call. There is also a Postman collection in `API/Postman/`.

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

## 📝 License & Notes

Personal learning project with no license file. Ask before reusing any of it.

- Logging out only clears the token from browser session storage. There is no server-side token revocation.
- Bulk delete in the UI loops over the single-customer endpoints rather than calling a bulk API.
- Architecture diagrams are in `Documentation/Diagrams/`. They predate the .NET 10 / Angular 22 rewrite, so some details have moved on.
- More detailed technical notes per layer are in [`ai_docs/`](ai_docs/index.md).
