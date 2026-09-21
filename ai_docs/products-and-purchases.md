# Products & Purchases

## What it is

A fixed 50-product tech catalogue (`tbl_products`), a customer↔product purchase link table (`tbl_customer_purchases`), a "Purchases" card on customer details, and a **Products** tab (list + per-product detail showing who bought it and when).

## Key files / paths

- DB: `Tables/tbl_products.sql`, `Tables/tbl_customer_purchases.sql`, `Stored_Procedures/usp_getProducts.sql`, `usp_getProductDetails.sql`, `usp_getCustomerPurchases.sql`, `usp_purchaseProduct.sql`; seed in `Post_Deployment_Scripts/post_deployment_populate_tbl_products.sql` (entry point: `post_deployment.sql`)
- API: `Domain/Models/ProductModel.cs`, `ProductDetailsModel.cs` (also holds `ProductBuyerModel`), `PurchaseModel.cs`; `BusinessLogic/CustomerFunctions/CustomerPurchasing.cs` (record a purchase), `CustomerGetting.cs` (`GetProductsFunction`, `GetProductDetailsFunction`, `GetCustomerPurchasesFunction`); `DbHelper.cs` (`HandleResponseWithProductList/ProductDetails/PurchaseList/PurchaseResult`); `CustomerController.cs`
- UI: `components/products/` (list), `components/product-details/`, the "Purchases" card in `components/customer-details/`; `services/product.service.ts`, `product-details.service.ts`, `purchase.service.ts`; `interfaces/product.ts`, `product-details.ts`, `purchase.ts`
- Tests: `Tests/CustomerFunctions/CustomerPurchasingTests.cs` (+ additions in `CustomerGettingTests.cs`); UI specs beside each component/service

## How it works

**Schema.** `tbl_products`: `PK_product_guid`, `product_name`, `category`, `comment`, `price` (`DECIMAL(10,2)`), `inventory_quantity` (units originally stocked, never changes), `stock_quantity` (units left), `depot` (the warehouse — "depos" in the original request was read as *depot*), with `CHECK`s that price ≥ 0 and `0 ≤ stock_quantity ≤ inventory_quantity`. `tbl_customer_purchases`: `purchase_id` (identity — a customer can buy the same product repeatedly, so (customer, product) isn't a key), `FK_customer_guid`, `FK_product_guid`, `purchase_date`. Column naming follows `tbl_addresses` (`FK_…`) / `tbl_customers` (`PK_…`).

**Seed.** 50 products (17 categories) with **hard-coded GUIDs**, inserted by `INSERT … SELECT … WHERE NOT EXISTS (same GUID)` — so redeploying never duplicates products and never resets `stock_quantity` once purchases have decremented it. Fictional brand names on purpose (no factual claims about real products). An SSDT project allows **one** post-deploy script, so `post_deployment.sql` `:r`-includes the merchants seed and the products seed; the two included files are `<None>` + `<Build Remove>` in the `.sqlproj` so they aren't also compiled as schema objects. **Adding a new NOT NULL column to an already-deployed `tbl_products` needs a default** (or a drop/redeploy of the local dev DB) — the table has seeded rows.

**Sold / inventory / left.** `sold_quantity` is **derived in SQL as `inventory_quantity - stock_quantity`**, not `COUNT(*)` of purchase rows. Reason: deleting a customer deletes their purchase rows but does *not* restore stock, so a count would shrink while "left" doesn't, and the three numbers stopped adding up. Consequence: the product-details buyers list only holds customers that still exist and can have fewer rows than `soldQuantity`; the page says so ("N sales were made to customers that have since been deleted").

**Recording a purchase** (`POST /api/Customer/purchase?customerGuid=&productGuid=`, `usp_purchaseProduct`). Checks in order: customer exists (`404`), customer not deactivated `1903` (`409` — active *and* test customers may buy), product exists (`404`), stock > 0 (`409 Product is out of stock.`). Then, in **one transaction**, `UPDATE … SET stock_quantity = stock_quantity - 1 WHERE … AND stock_quantity > 0` (the guard lives in the `UPDATE` itself, not a read-then-write, so two buyers of the last unit can't both succeed) plus the `INSERT` of the purchase row. Quantity is always 1 per purchase. `CustomerPurchasing` validates both GUIDs (`400`), and on success writes a `Purchased` audit entry with details `Product: <name>` (best-effort, like every other mutation — see [database](database.md)). The proc's result row carries an extra `product_name` column (only meaningful on `result = 0`); `HandleResponseWithPurchaseResult` returns it as `Data`, `CustomerPurchasing` uses it for the audit entry and then **strips it** so the response keeps the "mutations carry no Data" convention.

**Deleting a customer** deletes their `tbl_customer_purchases` rows first, inside `usp_deleteCustomer`'s existing transaction (the FK would otherwise block the delete). Unlike the audit log — which deliberately has no FK and outlives the customer — purchases are the customer's own data. Stock is **not** restored.

**Endpoints** (all on `CustomerController`, JWT-required): `GET /products` (all 50, category/name order, unpaginated), `GET /productDetails?productGuid=` (product + buyers, newest first; `usp_getProductDetails` returns **two result sets** — product, then buyers — read with `NextResultAsync`; zero rows in the first = `404`), `GET /purchases?customerGuid=` (a customer's history, newest first, joined to product name/category/price), `POST /purchase`. They sit on `CustomerController`/`ICustomerService`/`CustomerGetting` rather than a new controller, matching how the global audit log is already hosted there.

**UI.**
- *Customer details* → "Purchases" card: a `<select>` of products grouped by category (`<optgroup>`; each option shows price and stock, out-of-stock options disabled), a hint with the product's description/stock/depot, a "Record purchase" button, then the history (product name links to its product page). After a successful purchase it re-fetches purchases, products (stock) and the audit trail; a failure (e.g. someone else took the last unit) shows an inline `role="alert"` and re-fetches stock. Disabled with an explanation for a deactivated customer (mirrors the proc's rule).
- *Products tab* (`/products`, nav link between Customers and Audit Log): columns Product, Category, Depot, Price, **Sold**, **Inventory**, **Left** ("Sold out" badge at 0). Product name links to `/productDetails?id=<guid>`.
- *Product details*: Stock card (Sold / Inventory / Left), Product card, and a Purchases table (customer — linked to their details page — email, when). One page header/`<h1>` is kept across loading, error and loaded states so the app's focus-the-`<h1>` navigation behaviour doesn't lose its target.
- `ProductService` (`httpResource`, lazily enabled by `loadProducts()`, `reload()`s on repeat calls since stock changes) feeds both the picker and the Products table; `ProductDetailsService`/`PurchaseService` follow `AuditLogService`'s guid-keyed `httpResource` pattern.

## Gotchas / conventions

- `price` on a purchase row is the product's **current** price, not what was paid — there's no price snapshot. Fine while the catalogue is fixed and there's no price-edit UI; add a `price_paid` column if that ever changes.
- No UI or API to add/edit/delete products — the catalogue is seed-only by design ("50 fixed products").
- Currency is unspecified: prices render as plain `1,299.00` with no symbol.
- The success toast for a purchase is `NotificationService.show('Purchase recorded.')`, fired in `PurchaseService.purchaseProduct`'s `tap`.
- `.table-themed` has a 760px min-width; the product-details buyers table overrides it (`.buyers-table { min-width: 0 }`) because it lives in a half-width card and would otherwise scroll sideways and clip the date.
- Deep-linking a guarded route (e.g. pasting `/productDetails?id=…`) bounces to `/login?sessionExpired=true` — pre-existing SSR/auth behaviour (the server render has no `sessionStorage`), not specific to these pages. Test by logging in and navigating client-side.
- Verified end-to-end against a real SQL Server (deployed the dacpac, ran the API, drove it with `curl`, and drove the UI in headless Chrome with axe-core: zero violations across the new states). The stored procedures themselves have no unit tests — like the rest of the DB layer, they're covered by running the real stack.
