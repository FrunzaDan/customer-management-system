# API

## What it is

The ASP.NET Core Web API: request pipeline, controllers, request validation, JWT auth, password hashing, and the test setup — everything under `API/`.

## Key files / paths

- `API/.../CustomerManagementSystem.WebAPI/Program.cs` — host setup, middleware pipeline, `AddJwtBearer` config.
- `API/.../CustomerManagementSystem.WebAPI/Controllers/AuthenticationController.cs`, `CustomerController.cs`
- `API/.../CustomerManagementSystem.WebAPI/Routing/KebabCaseParameterTransformer.cs` — turns `[controller]` into the lowercase kebab-case URL segment (`CustomerController` → `/api/customer`).
- `API/.../CustomerManagementSystem.DataAccess/DBConnection/DbHelper.cs` — builds typed `SqlParameter`s and maps stored-proc result sets to typed `ResponseModel<T>`s; `SqlExtensions.cs` holds the typed parameter/reader helpers it uses.
- `API/.../CustomerManagementSystem.BusinessLogic/CustomerFunctions/CustomerCreation.cs`, `CustomerUpdating.cs`
- `API/.../CustomerManagementSystem.BusinessLogic/Validations/EmailValidation.cs`, `PhoneNumberValidation.cs`, `AddressValidation.cs`
- `API/.../CustomerManagementSystem.BusinessLogic/Constants/RegexConstants.cs`, `API/.../CustomerManagementSystem.Domain/Constants/FieldLengthConstants.cs`
- `API/.../CustomerManagementSystem.Domain/Models/Enums.cs` — `Gender`, `CustomerStatus`, `MerchantRole`, `AuditAction`, `CustomerSortColumn`, `SortDirection`
- `API/.../CustomerManagementSystem.BusinessLogic/AuthFunctions/JwtCreation.cs`, `JwtSigningKey.cs`
- `API/.../CustomerManagementSystem.BusinessLogic/Services/Implementation/AuthService.cs`
- `API/.../CustomerManagementSystem.DataAccess/DBConnection/DbUtils.cs` — `CheckMerchantCredentialsFromDb`
- `API/.../CustomerManagementSystem.DataAccess/DBConnection/PasswordHasher.cs`
- `global.json` (repo root) — `{ "test": { "runner": "Microsoft.Testing.Platform" } }`
- `API/.../CustomerManagementSystem.Tests/CustomerManagementSystem.Tests.csproj`
- `API/.../Directory.Build.props` (shared `net10.0`/nullable/implicit-usings settings, nullable warnings are errors) and `Directory.Packages.props` (Central Package Management — every package version lives there, `.csproj` files have none)
- `API/.../CustomerManagementSystem.WebAPI/OpenApi/BearerSecuritySchemeTransformer.cs`

## How it works

### Layering & request pipeline

`WebAPI` (controllers/host) → `BusinessLogic` (services, validation, JWT) → `DataAccess` (ADO.NET + stored procs) → `Domain` (models/config). All customer/merchant DB access goes through **stored procedures** — no inline SQL, no ORM. See [database](database.md) for the schema/proc side.

**Middleware order in `Program.cs`** (order matters): `UseExceptionHandler` → `UseStatusCodePages` → `Cache-Control: no-store` middleware → `UseCors` → `UseHttpsRedirection` → `UseRateLimiter` → `UseAuthentication` → `UseAuthorization` → `MapHealthChecks("/health")` → `MapControllers`. In non-Development environments, `UseHsts()` runs alongside `UseHttpsRedirection`; in Development, `MapOpenApi()` serves the built-in OpenAPI document at `/openapi/v1.json` and Swagger UI (`Swashbuckle.AspNetCore.SwaggerUI` only — Swashbuckle no longer generates the document) shows it at `/swagger`, with the JWT bearer scheme added by `BearerSecuritySchemeTransformer`.

- `GET /health` is ASP.NET Core's health-check endpoint (`AddHealthChecks()`/`MapHealthChecks`, no DB probe — liveness only; not on a controller, no `[Authorize]`, answers `200` with the plain-text body `Healthy`, not the `ResponseModel` shape), the same mechanism as the sibling apps. It exists so the Angular UI can poll for API liveness and show an "API is not running" banner instead of the app looking broken (see [angular-frontend](angular-frontend.md)); the UI reads it with `responseType: 'text'`. Being unauthenticated is intentional: it needs to answer even when nobody has a token yet.
- Every response is sent with `Cache-Control: no-store` (live, per-user data behind a bearer token — no browser or proxy should keep a copy), the same as the sibling apps.
- **Errors** are all RFC 9457 Problem Details — see "Error handling" below.
- CORS is locked to `Cors:AllowedOrigins` in `appsettings.json` (`http`/`https` on `localhost:4203` and `localhost:4203` — 4203 is the port `UI/angular.json` actually serves on; an origin missing from this list shows up in the browser as a CORS block on `/health` and the "API is not running" banner even though the API is up), methods limited to `GET/POST/PATCH/DELETE`, headers limited to `Content-Type`/`Authorization`. No `AllowCredentials()` — consistent with bearer-token (not cookie) auth.
- Swagger UI is only wired up in Development, with a Bearer-JWT security scheme so tokens can be pasted in for manual testing.
- `AddRateLimiter` registers one named policy, `"login"`: a per-client-IP fixed-window limiter (5 requests/minute, in-memory), applied via `[EnableRateLimiting("login")]` on just `AuthenticationController.GetAccessToken` — not global, so it never throttles `verify-token` or any `CustomerController` endpoint. Exceeding it short-circuits with `429`, a `Retry-After` header and a Problem Details body written by `options.OnRejected` through `IProblemDetailsService` (it runs before MVC). In-memory/per-instance, resets on app restart — a deliberate choice for this app's single-instance local/demo scope, not a persistent/distributed solution.

### Error handling

Every error response is **RFC 9457 Problem Details** (`Content-Type: application/problem+json`, with `type`, `title`, `status`, `traceId`, and `detail`/`errors` where there's something to say) — the same mechanism and the same bodies in all three apps: one `IExceptionHandler`, no try/catch in controllers, services or data access, exception text only in Development. Successes still use the `ResponseModel` envelope (see "Uniform response shape" below).

| Situation | Status | Body | Produced by |
|---|---|---|---|
| Malformed JSON, or a value that doesn't bind (bad GUID/`DateOnly`/enum name) | `400` | `ValidationProblemDetails` — `errors: { field: [messages] }` | `[ApiController]`, before the action runs |
| A business rule (missing/invalid field, `Guid.Empty` ID, missing credentials) | `400` | `ProblemDetails`, the message as `detail` | the business-logic class returns `ResponseModel(400, …)`; `ApiControllerBase.Reply` turns every 4xx result into Problem Details |
| Wrong username or password / a role that may not sign in | `401` / `403` | same | `DbUtils.CheckMerchantCredentialsFromDb` |
| Not found / conflicting state (duplicate email or phone number, already deactivated/active, must be deactivated before delete, deactivated customer or out of stock on a purchase) | `404` / `409` | same | the stored procedure's `(Result, Message)` row |
| Missing/expired bearer token, wrong role, unknown route, wrong method | `401`/`403`/`404`/`405` | `ProblemDetails` | JWT bearer handler / routing; the body comes from `UseStatusCodePages()` |
| Too many login attempts | `429` | `ProblemDetails` + `Retry-After` header | the rate limiter's `OnRejected`, via `IProblemDetailsService` |
| Anything thrown (SQL down, an error a proc re-`THROW`s, misconfiguration, bug) | `500` | `ProblemDetails`; `detail` = the exception message **in Development only** | `GlobalExceptionHandler` (registered with `AddExceptionHandler`, run by `UseExceptionHandler()` first in the pipeline) — logs it once with method + path |
| Client aborted the request | `499` | none | `UseExceptionHandler` itself, not logged as an error |

- The stored procedures share one pattern (see [database](database.md), "Error handling"): expected outcomes are `(Result, Message)` rows; anything unexpected is re-`THROW`n and reaches `DbUtils` as a `SqlException`, which it doesn't catch or wrap — it goes to `GlobalExceptionHandler` unchanged. A proc that returns no `(Result, Message)` row is a bug: `DbHelper` throws `InvalidOperationException`. A misconfigured `Auth:AccessTokenTimeout` throws the same way (a `500`, not a login error).
- The only `catch` blocks left are deliberate: `CustomerAuditLogger`'s best-effort audit write (a failed log entry never fails the request that already succeeded) (there is no other).
- The UI reads these bodies in `UI/src/app/utils/extract-error-message.ts`, byte-identical in all three apps: the `errors` messages, else `detail`, else `title` (see [angular-frontend](angular-frontend.md)).
- Tests: `Tests/ErrorHandling/ErrorResponseTests.cs` runs the real pipeline in memory (`WebApplicationFactory<Program>`, service layer mocked) — the same cases as Imalo's.

### Database connection

One connection string in all three sibling apps: `ConnectionStrings:DefaultConnection` in `appsettings.json`, pointing at the local Docker SQL Server (`Server=localhost,1433;Database=CustomerManagement;User Id=sa;…;Encrypt=True;TrustServerCertificate=True` — encrypted, with the container's self-signed certificate trusted; `run.sh`'s `sqlpackage` publish uses the same settings). `AppSettingsConfig.DefaultConnection` (used by `DbUtils`) reads it with `GetConnectionString("DefaultConnection")` and throws `InvalidOperationException` if it's missing. To point a machine elsewhere (a Windows SQL Server instance, another password), override it without editing the file: `dotnet user-secrets set ConnectionStrings:DefaultConnection "<connection string>"` in the API project (it has a `UserSecretsId`; secrets load in Development), or the `ConnectionStrings__DefaultConnection` environment variable. Every data-access call opens a new `SqlConnection` and disposes it; SqlClient pools the physical connections, so that's the intended usage, not a cost. There is no connection probing or fallback: if the database is unreachable, the `SqlException` goes to `GlobalExceptionHandler` like any other unexpected error (logged once, `500` Problem Details).

### Logging

Same setup in all three APIs (the sibling apps' `api.md` has this section too): built-in `Microsoft.Extensions.Logging`, no third-party logger.

- **Console output**: JSON (`FormatterName: json`, UTC ISO-8601 timestamps, scopes on) in `appsettings.json`, so every line carries `TraceId`/`SpanId`/`RequestId` and can be read by any log collector; `appsettings.Development.json` switches to the readable single-line `simple` formatter. Levels: `Default: Information`, `Microsoft.AspNetCore: Warning`.
- **Access log**: `AddHttpLogging` + `UseHttpLogging()` (outermost middleware, so it records the final status, including a 500 from the exception handler) writes one line per request (`CombineLogs`) with method, path, status code and duration only; headers and bodies are left out because they carry bearer tokens, passwords and personal data. `/health` opts out (`.WithHttpLogging(HttpLoggingFields.None)`) because the UI polls it every 15 s. The category `Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware` is raised to `Information` in `appsettings.json`.
- **Application logs** use compile-time `[LoggerMessage]` methods (`private static partial void Log…(ILogger logger, …)` on a `partial` class), not `logger.LogX(...)` extension calls: the template is parsed at build time, arguments aren't boxed, and nothing runs when the level is off. Event ids are shared across the three APIs: `1` = unhandled exception (`GlobalExceptionHandler`), `2` = audit write failed (the best-effort audit write).
- **What gets logged**: unexpected failures only, once each. An unhandled exception is logged by `GlobalExceptionHandler` alone (since .NET 10 `ExceptionHandlerMiddleware` doesn't log exceptions an `IExceptionHandler` handled), and the client gets its `traceId` in the Problem Details body to match the log entry. Expected outcomes (404, 409, validation 400) are not logged separately; the access log already has them. Data access and services don't log routine operations.
- **Tests**: `Microsoft.Extensions.Diagnostics.Testing`'s `FakeLogger`/`FakeLogCollector` check what was logged (level, event id, structured state), in the audit-logger tests and in `ErrorResponseTests` (the exception is logged exactly once, and there's one access-log line per request and none for `/health`).

### Controllers

- `AuthenticationController` (`/api/authentication`):
  - `POST /access-token` — body `{ username, password }` → JWT if credentials check out. Rate-limited (see above).
  - `GET /verify-token` — `[Authorize]`-gated; if the request gets past the JWT middleware, the token is valid — the endpoint has nothing left to do but return 200.
- `CustomerController` (`/api/customer`) — class-level `[Authorize]`, every endpoint requires a bearer token:
  - `POST /create`, `GET /get?searchTerm=...`, `GET /all`, `GET /export`, `GET /audit-log?customerId=...`, `GET /audit-log/all`, `PATCH /update`, `PATCH /deactivate?customerId=...`, `PATCH /reactivate?customerId=...`, `DELETE /delete?customerId=...`, `DELETE /audit-log/all`.
  - Products & purchases (see [products-and-purchases](products-and-purchases.md)): `GET /products`, `GET /product-details?productId=...`, `GET /purchases?customerId=...`, `POST /purchase?customerId=...&productId=...`, `POST /product`. `POST /purchase` follows the normal mutation convention (`400` bad GUID, `404` unknown customer/product, `409` deactivated customer or out of stock) and writes a `Purchased` audit entry via the new `CustomerPurchasing` class (registered alongside the other `CustomerFunctions` in `BusinessLogicDependencyInjection.cs`). `POST /product` adds a new product (`ProductCreation`, mirrors `CustomerCreation`: validate, then return the DB-generated GUID as `Data`) but writes **no** audit entry — the audit log's `CustomerId` column is `NOT NULL`, so it has no slot for a customer-less mutation.
  - `GET /monthly-activity` — feeds the Charts tab's time-series charts (see [charts](charts.md)): customer registrations and product purchases, each grouped by month, from `Report_GetMonthlyActivity`. A thin passthrough like `GET /products` (no request params, no paging — both series are one row per month with any activity).
  - `GET /export` is the one endpoint that doesn't return the uniform `ResponseModel` JSON shape below — on success it returns a raw `text/csv` `File` result instead (see [database](database.md)); on failure it returns the same Problem Details as every other endpoint (`Reply(response)`).
  - `DELETE /audit-log/all` permanently wipes **every** row in `CustomerAuditLog` for **every** customer (`CustomerAuditLog_DeleteAll` — a plain unconditional `DELETE`, no soft-delete). Wired to a "Clear audit log" button on the global audit log page (`global-audit-log.component.ts`'s `clearAuditLog()`), guarded client-side by a `confirm()` prompt. Carries `[Authorize(Roles = "1801")]` in addition to the class-level `[Authorize]` — a no-op today since `1801` is the only role that exists (see Known gaps below), but it stops a future second role from silently inheriting access to this destructive, untargeted action. The deletion itself is deliberately not audit-logged (no `CustomerId` to attach it to once the table is wiped).

**Uniform response shape:** every mutating stored proc returns a `(Result INT, Message NVARCHAR)` result set (`Result = 0` means success; nonzero mirrors an HTTP status). `DbHelper.HandleResponseWithMessage` reads that into a `ResponseModel<object>`, and every controller (all derive from `ApiControllerBase`) passes it to `Reply(response)` — a success goes out as the envelope with its status, a failure as Problem Details (see "Error handling") — controllers never branch on status themselves. `ResponseModel<T>.Data` is typed per endpoint (`ResponseModel<CustomerModel>`, `ResponseModel<PagedResponse<CustomerModel>>`, ...) and each action is declared `ActionResult<ResponseModel<T>>`, so Swagger shows the real schema. Mutations carry no `Data` (`ResponseModel<object>`, always null) — **except the two creates**, `POST /create` and `POST /product`, whose `Data` is the new row's GUID (`ResponseModel<Guid?>`), since the key is generated by the DB and the client has no other way to learn it. Errors never use the envelope: every error response, whatever produced it, is Problem Details.

### Data types (DB ↔ C# ↔ JSON)

- **Serializer: System.Text.Json** (the ASP.NET Core default; camelCase, case-insensitive reads; null properties are written as `null`, as in Imalo). Newtonsoft.Json was removed.
- **Request vs response models are separate.** Responses (`CustomerModel`, `ProductModel`, `AuditLogEntry`, ...) are `sealed record`s with `required` members that mirror the `NOT NULL`-ness of their columns — only genuinely optional fields (`BirthDate`, `Description`, `Details`, a deleted customer's name in the global audit log) are nullable. Requests (`CreateCustomerRequest`, `UpdateCustomerRequest`, `AddressRequest`, `CreateProductRequest`) are all-nullable with no `[Required]`, same reasoning as `MerchantCredentials`: the business-logic classes validate every field and reply with a field-specific `400`. `CreateCustomerRequest`/`CreateProductRequest` have no ID at all (the DB generates it), and `UpdateCustomerRequest` has no `Status` (edit is not a lifecycle transition) — so neither rule needs a runtime check any more; the shape can't express the forbidden input. Unknown JSON properties (e.g. the UI sending `createdAt`) are ignored.
- **IDs are `Guid`**, both in models and as `[FromQuery] Guid` parameters (`customerId`, `productId`). A malformed value fails model binding; a missing one binds to `Guid.Empty`, which each business-logic method rejects with its own `400`. `GuidValidation`/`GuidRegex` were deleted — `Guid.TryParse` (in `CustomerGetting.DetermineLookup`) accepts every spelling (braces, upper case, no hyphens), and since the DB compares `UNIQUEIDENTIFIER`s by value, all of them find the same customer.
- **Dates:** `BirthDate` is `DateOnly` (JSON `"1990-01-02"`); timestamps are `DateTime` with `Kind = Utc` (JSON `"2026-09-22T05:47:00Z"`). The `Z` matters: `SqlExtensions.GetUtcDateTime` marks every `DATETIME2` it reads as UTC, because the reader returns `Unspecified` and without the `Z` browsers parse the value as local time (every timestamp was previously shown off by the viewer's UTC offset). `AccessTokenResponse.ExpiresAt` is a UTC `DateTime` taken from the same instant as the token's `exp`.
- **Codes are enums:** `Gender : byte` and `CustomerStatus : short` / `MerchantRole : short` match their `TINYINT`/`SMALLINT` columns and serialize as numbers (the documented codes). `AuditAction` serializes by name (`[JsonConverter(typeof(JsonStringEnumConverter<AuditAction>))]`) and is stored by name. `CustomerSortColumn`/`SortDirection` bind from the query string case-insensitively (`?sortColumn=name`). A number that isn't an enum member (JSON `"gender": 7`, `?sortColumn=7`) still binds, so each is backstopped with `Enum.IsDefined` in the business logic.
- **Model-binding failures** (bad GUID, bad `DateOnly`, unknown sort name) return ASP.NET's standard `400` `ValidationProblemDetails` (`errors` keyed by the JSON path, e.g. `$.birthDate`), like every other error — see "Error handling".
- **SQL parameters are typed** (`SqlParameterExtensions`: `AddGuid`, `AddNVarChar(size)`, `AddVarChar(size)`, `AddTinyInt`, `AddSmallInt`, `AddDate`, `AddDecimal(12, 2)`), never `AddWithValue`, so each matches its proc parameter exactly — critically, the phone number (`@PhoneNumber`) is sent as `VARCHAR`, since an `NVARCHAR` parameter would force a conversion of the `VARCHAR` column and turn `UQ_Customer_PhoneNumber` seeks into scans. Reads use typed getters (`GetGuid`, `GetByte`, `GetInt16`, `GetDateOnly`, ...), so a schema/mapping mismatch throws instead of being silently converted.
- **JWT claims:** `iat` is written by the token handler from `SecurityTokenDescriptor.IssuedAt` as an RFC 7519 NumericDate (it used to be a hand-built ISO string claim); the role claim is the numeric code (`"1801"`), which `[Authorize(Roles = "1801")]` matches.

### Validation (before a stored procedure is ever called)

- **`CustomerCreation`**: rejects missing names, missing/invalid `Email` or `PhoneNumber`, and a missing `Address` or any missing address field (`400` — every `CustomerAddress` column is `NOT NULL`, so a missing one would otherwise surface as an opaque `500`); the new ID comes back from the DB (see [database](database.md)).
- **`CustomerUpdating`**: `CustomerId` is required (non-`Guid.Empty`); `Email`/`PhoneNumber`, if present in the request, are format-validated before the edit is attempted — but unlike registration, they're optional here (partial update). There's no `Status` on `UpdateCustomerRequest` at all — edit is a partial-update endpoint, not a lifecycle-transition one, so a client can't use it to bypass `DeactivateCustomer`/`ReactivateCustomer`/`DeleteCustomer`'s dedicated audit trail and stored-procedure guardrails.
- **Field length caps**: `FieldLengthConstants` (in `Domain`, since both `BusinessLogic` and `DataAccess` use it) mirrors the column/parameter lengths declared in the DB schema (`Email` 254, `PhoneNumber` 15, ...). Both `CustomerCreation` and `CustomerUpdating` reject an over-length `FirstName`/`LastName`/`Email`, and `AddressValidation.ValidateLengths` (shared by both) checks every address field — without this, an over-length value would either be silently truncated by SQL Server or surface as an opaque error instead of a clean `400`.
- **`BirthDate`/`Gender`**: `BirthDate`'s format is guaranteed by its type (`DateOnly` — a malformed value never deserializes); `Gender`, if present, must be a defined `Gender` member. An omitted `Gender` on registration means `NotDeclared` (the column's default).
- **`ProductCreation`** also rejects a `Price` with more than two decimals or above `9,999,999,999.99` — what `DECIMAL(12,2)` can hold — rather than letting SQL Server silently round or overflow.
- Email/phone number **uniqueness** is enforced in `Customer_Create` (create) and `Customer_Update` (edit, excluding the row being edited itself) — `409` if either already exists on another customer. This is a DB-layer check, not duplicated in C#.
- The same regexes exist client-side too, in Angular's `environment.ts` (`emailRegex`, `phoneNumberRegex`, `usernameRegex`) — kept in sync **manually**, not shared/generated from one source.
- Validation failures return `400` with a plain message, distinct from the `404`s used for "not found"/"no valid search key" and `409`s used for lifecycle conflicts (see [database](database.md)) — status code choice is meaningful here, not arbitrary.

### JWT auth flow

**Issuing** (`POST /api/authentication/access-token`):

1. `AuthService.GetAccessToken` rejects an empty username/password (`400`), otherwise delegates straight to `JwtCreation.GenerateBearerJwt`.
2. `JwtCreation.GenerateBearerJwt` calls `DbUtils.CheckMerchantCredentialsFromDb`, which fetches the merchant's password hash/salt/role via `Merchant_GetAuthData` and verifies the password (see Password security below). The success response's `Data` carries the merchant's role (an `int?`) back up.
3. On success, a JWT is minted: symmetric **HMAC-SHA256** signing (`SymmetricSecurityKey` + `HmacSha256Signature`), key from `Auth:SecureJWTKey` in `appsettings.json` via `JwtSigningKey.Create` (committed value is a demo placeholder — see Known gaps below).
4. **Claims on the token**: `ClaimTypes.Sid` = username, `JwtRegisteredClaimNames.Sub` = username, `ClaimTypes.Name` = username (no separate display name exists yet), `ClaimTypes.Role` = the merchant's role fetched in step 2 (empty string if somehow null), `"amr"` = `"pwd"` (authentication-method-reference, OIDC-style — documents _how_ the subject authenticated), `Jti` = random GUID, `Iat` = issue time.
5. Issuer/Audience both `https://localhost:7145/` (demo value), expiry from `Auth:AccessTokenTimeout` (currently `15` minutes).

**Validating** — there is now **one** place tokens are checked, deliberately: `Program.cs`'s `AddJwtBearer` middleware, which runs on every `[Authorize]`-attributed endpoint (all of `CustomerController`, plus `AuthenticationController.VerifyToken`). It checks signature, issuer, audience, and expiry (`ClockSkew = TimeSpan.Zero`, no grace period), deriving its `IssuerSigningKey` from the same `JwtSigningKey.Create` used at issuing time. `ClaimTypes.Role` is ASP.NET's default role-claim type, so `[Authorize(Roles = "1801")]` works on any endpoint today without touching the JWT pipeline further (used on `DELETE /audit-log/all`, above).

- There used to be a **second**, hand-rolled validation path — a `JwtValidation` class used internally by `AuthService` as a self-check right after minting a token, and an unused `HttpClient` built from an `IHttpClientFactory` that was never actually called with. Both were dead code (request-time auth was always enforced solely by the `AddJwtBearer` middleware) and were deleted; `AuthService` now just checks credentials and returns whatever `JwtCreation` produces (constructor-injected, not manually `new`'d). If you see references to `JwtValidation.cs` elsewhere (older docs, comments), they're stale.
- `JwtCreation.cs` and `Program.cs` used to each independently call `Encoding.ASCII.GetBytes(key)` to derive the signing key — two unsynchronized copies of the same logic. Both now go through the single `JwtSigningKey.Create`. The key is still raw ASCII bytes of the configured string, not base64-decoded, despite `SecureJwtKey` looking like base64 — that behavior itself is unchanged, only the duplication was fixed.
- The role claim only reflects the merchant's role **at login time** — the token itself isn't re-checked against the DB later, so a role change mid-session only takes effect on the next login (inherent to stateless JWTs, not a bug).

### Password security

- `PasswordHasher.cs`: **PBKDF2-HMACSHA256**, 100,000 iterations, 16-byte random salt, 32-byte hash (`Rfc2898DeriveBytes.Pbkdf2`). Verification uses `CryptographicOperations.FixedTimeEquals` — a constant-time comparison, not `==`, so timing doesn't leak how many leading bytes matched.
- `Merchant` stores `PasswordHash` (BINARY 32, the hash) and `PasswordSalt` (BINARY 16) as **separate columns** — the plaintext password is never stored or logged anywhere.
- `Merchant_GetAuthData` fetches the hash+salt+role for a username and bumps `LastInteractionAt`; the actual comparison (`PasswordHasher.VerifyPassword`) happens in **C#, not SQL**.
- The seeded demo login (`TestMerchantID` / `Merchant123`, see [build-and-run](build-and-run.md)) has its hash+salt precomputed and hardcoded in the post-deployment script's `BINARY` literals.
- This replaced an earlier **unsalted SHA-256** scheme — if unsalted-hash code or a single hash column reappears, that's a regression, not an alternate valid approach.

### Testing (xUnit v3 on .NET 10 SDK)

- The test project covers `BusinessLogic` (validations including `AddressValidation`, `JwtCreation`, `AuthService`, `CustomerCreation`/`Editing`/`Getting`/`Activation`/`Deletion`) and `DataAccess`'s `PasswordHasher` — all pure logic, no live DB or Docker needed. This is why `build.sh` runs `dotnet test` _before_ the DB/Docker steps.
- `DbHelper` (stored-proc-result → `ResponseModel` mapping, including the `SqlDataReader`-based row mappers) is **not** unit tested — it takes a concrete `SqlDataReader`, not an interface, so exercising it would need a live connection or a structural change to introduce a mockable seam. Covered indirectly today only by manual testing (Postman/Swagger) and the app actually running.
- Packages: `xunit.v3.mtp-v2` (xUnit v3 on **Microsoft Testing Platform v2**), `Moq` for mocking `IDbUtils`/`IAppSettingsConfig`, and `Microsoft.Testing.Extensions.CodeCoverage` (`dotnet test --coverage`). The VSTest-era packages (`Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio`, `coverlet.collector`) were removed — under MTP they did nothing. The same setup is used by both sibling apps.
- Tests take the test's cancellation token from `TestContext.Current.CancellationToken` (xUnit v3), never `CancellationToken.None`.
- The **.NET 10 SDK dropped VSTest support for xUnit v3** — `dotnet test` runs MTP only because the repo-root `global.json` says `{ "test": { "runner": "Microsoft.Testing.Platform" } }`.
- That `global.json` is discovered by walking **up from the current working directory** `dotnet` is invoked from — not from the project or `.sln` path — so `dotnet test` has to run from inside the repo (`build.sh` `cd`s to the repo root for its test step).
- `DB/CustomerManagement/global.json` is a separate one that deliberately pins the SQL project's build to the .NET 8 SDK (kept alongside the Docker SQL Server setup); `Microsoft.Build.Sql` 2.3.0 builds under it. Discovery stops at the nearest `global.json`, so the two don't conflict.
- xUnit v3 test projects compile to a **console executable** (`<OutputType>Exe</OutputType>` in the `.csproj`), not a library — the test assembly is its own runner now, a fundamental v3 architecture change from v2.

## Known gaps / deliberately deferred

Read before assuming something below is an oversight rather than a known, confirmed-with-the-user limitation.

- **`Auth:SecureJWTKey` is a placeholder value** committed in `appsettings.json` — fine for local dev, must be replaced (and pulled out of source control) for any real deployment. Not a live secret to protect; this repo's whole security posture assumes local-only use.
- **No JWT revocation mechanism.** Tokens carry a `Jti` but nothing persists or checks it — a stolen token stays valid until it naturally expires. There's a working client-side logout (see [angular-frontend](angular-frontend.md)), but that's just the client discarding its own copy; a token that already leaked elsewhere (e.g. captured before logout) is still valid until its natural expiry. Deliberate choice, confirmed with the user, over adding server-side revocation (a `Jti` denylist checked per-request) or a refresh-token scheme — both would give up the current fully-stateless design for a bigger architectural change than this app's scope currently justifies.
- **`CheckMerchantCredentialsFromDb`'s role-mismatch branch leaks the merchant's numeric role** in its `403` message (`"The provided merchant role ({role}) is not valid."`) instead of the generic "Invalid username or password." used for a bad password. Low severity (needs already-valid credentials to trigger). Deliberately left as-is — demo-only messaging, not worth the churn of touching it.
- **Single role in practice**: `1801` (`MerchantRole.Merchant`) is the only `RoleCode` value currently seeded or checked against (`DbUtils.CheckMerchantCredentialsFromDb` checks `== MerchantRole.Merchant`). The JWT does carry a `ClaimTypes.Role` claim, so per-endpoint `[Authorize(Roles = ...)]` would work if a second role is ever introduced — nothing needs to change in the token pipeline for that, only the DB check and any new `[Authorize]` attributes.
- Don't treat this list as a TODO to clear autonomously — several of these (placeholder JWT key, single role, role-message leak, no server-side revocation) are appropriate for a local-learning-project scope and were explicitly confirmed as "leave alone."

**Resolved** (kept for history — don't rediscover these as "new" findings):

- `IDbUtils.CheckMerchantCredentialsFromDb` returning `ResponseModel<object>` cast back to `int?` via `credentialsCheck.Data as int?` — fixed: now `ResponseModel<MerchantRole?>`.
- Most of `IDbUtils`/`ICustomerService` returned `ResponseModel<object>`, and `CustomerModel` doubled as the create request, edit request and response (so every member was nullable, GUIDs/dates were strings, codes were `int`) — previously left as-is deliberately; fixed at the user's explicit request (2026-09-23) in the data-types pass described under "Data types" above.
- No rate limiting or account lockout on `POST /api/authentication/access-token` — fixed: the `"login"` rate-limiter policy described above.
- `DELETE /api/customer/audit-log/all` was gated only by the controller's class-level `[Authorize]` — fixed: now also carries `[Authorize(Roles = "1801")]`, see Controllers above.
- The JWT signing key was derived independently in two places — fixed via `JwtSigningKey.Create`, see JWT auth flow above.
- `AuthService`/`JwtCreation` used to be manually `new`'d instead of DI-registered — fixed: both are now properly registered in `BusinessLogicDependencyInjection.cs` (`JwtCreation` as a singleton) and constructor-injected.

## Gotchas / conventions

- Don't add try/catch in controllers — the global exception handler is the intended single place for that.
- If you change a regex, remember there are two copies (C# `Validations/`, Angular `environment.ts`) — nothing enforces they match.
- If you change a DB column's type or length, update three things together: the column, every proc parameter compared with it, and `FieldLengthConstants`/the `SqlParameterExtensions` call — nothing enforces they match, and a type mismatch between parameter and column silently costs index seeks.
- `DbHelper`'s row mappers read nullable columns via `GetNullableString`/`GetNullableGuid`/`GetNullableDateOnly`, and `NOT NULL` ones via the non-nullable getters — keep new mappings consistent with the column's nullability (a real `DBNull` must surface as `null`, never `""`).
- Any new timestamp read must go through `GetUtcDateTime`, or it'll serialize without the `Z` and display in the wrong time zone.
