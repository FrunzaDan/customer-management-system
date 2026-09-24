# Database

## What it is

The `CustomerManagement` SQL Server database, as an SSDT project under `DB/CustomerManagement/`. All access goes through stored procedures.

## Key files / paths

- `Tables/`:
  - `Customer`, `CustomerAddress`, `Merchant`;
  - `CustomerAuditLog`;
  - `Product`, `CustomerPurchase`.
- `StoredProcedures/` — procs named `<Entity>_<Verb>`, for example `Customer_List`, `CustomerPurchase_Create` and `Report_GetMonthlyActivity`.
- `Scripts/PostDeployment/` — `PostDeployment.sql` `:r`-includes `Seed_Merchant.sql` and `Seed_Product.sql`.
- `global.json` — pins the .NET 8 SDK for this project. Keep it.

## How it works

### Tables

- **`Customer`:**
  - `CustomerId` (`NEWSEQUENTIALID()`);
  - `FirstName`, `LastName`;
  - `Email` (unique) and `PhoneNumber` (`VARCHAR(15)`, unique);
  - `Gender` (`TINYINT`, 0/1/2);
  - `BirthDate` (`DATE`, nullable);
  - `StatusCode` (`SMALLINT`, default 1901);
  - `CreatedAt`, `LastInteractionAt`.
- **`CustomerAddress`:** one row per customer. `CustomerId` is both the primary key and the foreign key. Every column is `NOT NULL`.
- **`Merchant`:**
  - `Username` is the primary key;
  - `PasswordHash` `BINARY(32)` and `PasswordSalt` `BINARY(16)`;
  - `RoleCode`.
- **`CustomerAuditLog`:**
  - `CustomerAuditLogId` is an `INT IDENTITY`;
  - `ActionType` is `Created`, `Edited`, `Deactivated`, `Reactivated`, `Deleted` or `Purchased`;
  - it has **no FK** to `Customer`, so history survives a delete.
- **`Product`:**
  - `Name`, `Category`, `Description`;
  - `Price` `DECIMAL(12,2)`;
  - `InitialQuantity`, `QuantityOnHand`, `Warehouse`.
- **`CustomerPurchase`:** an identity key, FKs to customer and product, and `PurchasedAt`.

### Procedures

- **`Customer_List`:** paged with `OFFSET`/`FETCH`. It searches with `LIKE` (wildcards escaped) and sorts through a `CASE` `ORDER BY` (no dynamic SQL). It returns two result sets, the total count and then the page, so an empty page past the end still reports the right total. Every sort ends on `CustomerId`, so equal names page deterministically. `/export` reuses it with page size 5000 and returns `400` when more rows match.
- **`Customer_Get`:** one `IF` branch each for id, phone number and email, so each gets an index seek.
- **`Customer_Update`:** a partial update (`ISNULL(@x, column)`) that updates the customer and address rows in one transaction.
- **`CustomerAuditLog_List`:** paged. The total is a separate first result set, so an empty page still reports the right total.
- **`Report_GetMonthlyActivity`:** returns two result sets, customers registered per month and purchases per month. Each month is returned as a first-of-month `DATE`, and the API formats it `yyyy-MM`.

### Customer lifecycle (enforced in the procs)

- New customers are active (`1901`). The generator creates test customers (`1904`).
- `Deactivate` needs a customer that isn't already deactivated; it saves the current status in `StatusCodeBeforeDeactivation`. `Reactivate` needs a deactivated one and restores that status, so a Test record stays Test. Otherwise the result is `409`.
- `Delete` needs status `1903` or `1904`. It deletes purchases, then the address, then the customer, in one transaction.
- Email and phone number duplicates are checked first (`409`). The unique constraints catch the race window, and the `CATCH` maps errors 2601/2627 to the same `409`.

### Products and purchases

- The 50 seeded products have fixed GUIDs and are inserted only `WHERE NOT EXISTS`, so a redeploy never resets stock.
- **`CustomerPurchase_Create` checks, in order:**
  - the customer exists (`404`) and isn't deactivated (`409`);
  - the product exists (`404`) and is in stock (`409`).
- **Recording the purchase:** it decrements stock with `WHERE QuantityOnHand > 0` and inserts the purchase row in the same transaction.
- **Sold** is `InitialQuantity - QuantityOnHand`. Deleting a customer does not restore stock.

### Error handling (all procs)

- Every proc starts with `SET NOCOUNT ON; SET XACT_ABORT ON`.
- Expected outcomes come back as `(Result, Message)` rows:
  - `400`: a referenced row is missing;
  - `404`: not found;
  - `409`: a duplicate or a state conflict.
- Multi-statement writes use `TRY` / `BEGIN TRANSACTION` / `CATCH` → `ROLLBACK` + `THROW`. Nothing returns `ERROR_MESSAGE()`.

### Naming and data types (shared by all three apps)

- **Naming:**
  - PascalCase everywhere, with no `tbl_`/`usp_`/`sp_` prefixes.
  - Tables are singular.
  - The primary key is `<Table>Id`.
  - Column suffixes: `…At` is a UTC `DATETIME2(3)`, `…Date` is a `DATE`, `…Code` is a checked code.
  - Constraints are always named: `PK_`, `FK_`, `UQ_`, `CK_`, `DF_`, `IX_`.
- **Types:**
  - Entity keys are `UNIQUEIDENTIFIER` + `NEWSEQUENTIALID()`; log keys are `INT IDENTITY`.
  - Names are `NVARCHAR(100)`, email is `NVARCHAR(254)`, phone number is `VARCHAR(15)` (digits only).
  - Money is `DECIMAL(12,2)`.
  - Timestamps are written with `SYSUTCDATETIME()`.
- **Parameters:** every parameter has exactly its column's type. A `VARCHAR` column compared with an `NVARCHAR` parameter loses its index seek.
- **API/UI names:** JSON and TypeScript names are the camelCase column names. A code column loses its `Code` suffix in C# and TypeScript: `StatusCode` → `status`.

## Gotchas / conventions

- Keep `run.sh`'s deploy (`sqlpackage` publish) as the only way the schema changes. There are no migration scripts.
- Adding a `NOT NULL` column to a seeded table needs a default.
- There are no unit tests for procs. They are exercised by running the real stack.
