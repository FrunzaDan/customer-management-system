# API

## What it is

The ASP.NET Core Web API (.NET 10) under `API/CustomerManagementSystemApi/`.

## Key files / paths

- `CustomerManagementSystem.WebAPI/Program.cs` — options, pipeline, JwtBearer, CORS, rate limiter.
- `WebAPI/Controllers/` — `AuthenticationController`, `CustomerController`, both deriving from `ApiControllerBase`.
- `WebAPI/ErrorHandling/GlobalExceptionHandler.cs` — the one place unhandled exceptions are logged.
- `BusinessLogic/CustomerFunctions/` — `CustomerCreation`, `CustomerUpdating`, `CustomerGetting`, `CustomerActivation`, `CustomerDeletion`, `CustomerPurchasing`, `ProductCreation`, `CustomerAuditLogger`.
- `BusinessLogic/AuthFunctions/` — `JwtCreation`, `JwtSigningKey`.
- `BusinessLogic/Validations/` — email, phone number and address rules.
- `DataAccess/DBConnection/` — `SqlConnectionFactory`, `DbUtils`, `DbHelper`, `SqlExtensions`, `PasswordHasher`.
- `Domain/Configuration/` — `AuthOptions`, `DatabaseOptions`.
- `Domain/Models/`, `Domain/Constants/FieldLengthConstants.cs`.
- `Directory.Build.props`, `Directory.Packages.props` — shared settings and central package versions.
- `CustomerManagementSystem.Tests/` — xUnit v3 tests.

## How it works

### Pipeline (`Program.cs`, in order)

1. `UseHttpLogging`
2. `UseExceptionHandler`
3. `UseStatusCodePages`
4. `Cache-Control: no-store`
5. CORS
6. HTTPS redirection
7. `UseRateLimiter`
8. authentication
9. authorization
10. `/health`
11. controllers

Other settings:
- **CORS:** only `Cors:AllowedOrigins`, which is the UI on port 4203.
- **OpenAPI and Swagger UI:** at `/openapi/v1.json` and `/swagger`, Development only.
- **Rate limit:** the `"login"` policy allows 5 requests per minute per IP, and is applied only to `POST /access-token`.

### Configuration (options pattern)

- Two sections are bound, each with `AddOptions<T>().BindConfiguration(...).ValidateDataAnnotations().ValidateOnStart()`:
  - `Auth` → `AuthOptions`, with keys `SecureJwtKey` (32+ characters), `JwtIssuer`, `JwtAudience` and `AccessTokenTimeoutMinutes` (1–1440).
  - `ConnectionStrings` → `DatabaseOptions`, with keys `Docker` (required) and `LocalSqlServer` (optional).
- A bad value stops startup with an `OptionsValidationException` naming the key.
- Consumers take `IOptions<T>`.
- Per-machine overrides go in user-secrets or environment variables (`Auth__…`, `ConnectionStrings__…`).

### Database connection

- `SqlConnectionFactory` picks a connection string once per process, on first use:
  - **macOS/Linux:** always `ConnectionStrings:Docker`, the Azure SQL Edge container. SQL Server has no macOS build.
  - **Windows:** it tries Docker with a 3-second probe, then falls back to `ConnectionStrings:LocalSqlServer` (Windows auth).
- The choice is logged as event 3 (Docker) or event 4 (the local fallback, a warning).
- `run.sh` passes `ConnectionStrings__Docker` for the container it started.
- Each call opens its own connection and disposes it. SqlClient pools the physical connections.

### Errors (RFC 9457 Problem Details)

- **Successes** use the `ResponseModel<T>` envelope. **Every error** is Problem Details.
- **`400`:**
  - binding failures come from `[ApiController]`;
  - business-rule failures come from the logic classes, and `Reply()` turns them into Problem Details.
- **`401`/`403`:** bad credentials or role, or a missing or expired token.
- **`404`/`409`:** from the proc's `(Result, Message)` row.
- **`429`:** the login rate limit.
- **`500`:** anything thrown, handled by `GlobalExceptionHandler`. `detail` is included in Development only.
- There's no try/catch in controllers, services or data access. The one exception is the best-effort audit write.

### Logging

- Built-in `Microsoft.Extensions.Logging`.
- Console format: JSON in `appsettings.json`; `simple` in Development.
- Access log: one line per request with method, path, status and duration. No headers or bodies, and `/health` is excluded.
- App logs are `[LoggerMessage]` methods with shared event ids across the three APIs:
  - 1 = unhandled exception;
  - 2 = audit write failed;
  - 3/4 = which database was chosen.

### Endpoints

- **`/api/authentication`:**
  - `POST /access-token`, which is rate-limited;
  - `GET /verify-token`, which requires `[Authorize]`.
- **`/api/customer`** (every endpoint requires `[Authorize]`):
  - Customers: `POST /create`, `GET /get?searchTerm=`, `GET /all` (paged, search, sort), `GET /export` (CSV), `PATCH /update`, `PATCH /deactivate`, `PATCH /reactivate`, `DELETE /delete`.
  - Audit log: `GET /audit-log?customerId=`, `GET /audit-log/all`, `DELETE /audit-log/all` (role `1801`).
  - Products and purchases: `GET /products`, `GET /product-details`, `POST /product`, `GET /purchases`, `POST /purchase`.
  - Charts: `GET /monthly-activity`.
- **`GET /health`:** liveness only, no auth.
- **Creates:** `POST /create` and `POST /product` return the new GUID as `data`. Other mutations return no `data`.

### Validation and data types

- **Requests and responses are separate models.**
  - Requests are all-nullable, and the logic classes return a `400` per field.
  - Responses are `sealed record`s with `required` members.
- **Types:** IDs are `Guid`, dates are `DateOnly`, and timestamps are UTC `DateTime` (serialized with a trailing `Z`).
- **Codes are enums:**
  - `Gender`, `CustomerStatus` and `MerchantRole` serialize as numbers.
  - `AuditAction` serializes by name.
- **Lengths:** `FieldLengthConstants` mirrors the column lengths.
- **SQL parameters are typed** (`AddVarChar`, `AddGuid`, …). `AddWithValue` is never used.
- **JSON:** System.Text.Json, camelCase, nulls written as `null`.

### Auth

- **Login:** `DbUtils` reads the hash, salt and role (`Merchant_GetAuthData`) and verifies PBKDF2-SHA256 in C#: 100k iterations, a 16-byte salt, and `FixedTimeEquals`.
- **Token:** `JwtCreation` signs an HMAC-SHA256 JWT with these claims: `sid`, `sub`, `name`, `role`, `amr`, `jti`, `iat`. The expiry comes from `AccessTokenTimeoutMinutes`.
- **Validation:** only `AddJwtBearer`, which checks the signature, issuer, audience and lifetime with `ClockSkew = 0`.

### Tests

- **Setup:**
  - `xunit.v3.mtp-v2` on Microsoft Testing Platform, selected by the repo-root `global.json`.
  - `Moq` for mocks and `FakeLogger` for log assertions.
  - `dotnet test --coverage` for coverage.
- **Covered:** validations, the business-logic classes, `JwtCreation`, `PasswordHasher` and `SqlConnectionFactory` (with a faked probe).
- **In-memory pipeline tests** (`WebApplicationFactory`):
  - `ErrorResponseTests`;
  - `StartupValidationTests`.
- No test needs a database.

## Gotchas / conventions

- Run `dotnet test` from inside the repo, so the root `global.json` is found.
- `DB/CustomerManagement/global.json` pins the SQL project to the .NET 8 SDK. Don't remove it.
- A regex exists twice, in C# `Validations/` and in Angular `environment.ts`. Change both.
- When changing a column, also change the proc parameter, `FieldLengthConstants` and the typed `SqlParameter`.
- Every new timestamp read goes through `GetUtcDateTime`.
- Known and accepted limitations:
  - the committed JWT key is a placeholder;
  - there is no token revocation;
  - there is a single role;
  - the `403` message shows the role code.
