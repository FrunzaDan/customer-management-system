# Charts

## What it is

The `/charts` tab: seven charts split into two groups — catalogue charts (off the existing product data) and time-series charts (off a new `usp_getMonthlyActivity` aggregate). All hand-built inline SVG/HTML, no charting library.

## Key files / paths

- DB: `Stored_Procedures/usp_getMonthlyActivity.sql`
- API: `Domain/Models/MonthlyActivityModel.cs` (`MonthlyActivityModel`, `MonthlyCountModel`); `DbHelper.HandleResponseWithMonthlyActivity`/`MapMonthlyCountFromReader`; `DbUtils.GetMonthlyActivity`; `CustomerGetting.GetMonthlyActivityFunction`; `CustomerController.GetMonthlyActivity` (`GET /monthlyActivity`)
- UI: `components/charts/charts.component.ts` (page); `components/charts/charts-data.ts` (pure data-transform functions, unit tested); `components/charts/ranked-bar-chart/`, `components/charts/stock-health-chart/`, `components/charts/time-series-chart/` (presentational subcomponents); `services/monthly-activity.service.ts`; `interfaces/monthly-activity.ts`
- Tests: `CustomerGettingTests.cs` (`GetMonthlyActivityFunction_ReturnsWhateverTheDbLayerReturns`); `monthly-activity.service.spec.ts`; `charts-data.spec.ts`

## How it works

**Catalogue charts** (`categorySold`, `bestSellers`, `stockHealth`, `revenueByCategory` — all `computed()` in `ChartsComponent`) read `ProductService.productsSignal`, the same unpaginated `GET /products` the Products tab already loads — no new endpoint. `rankByCategory` (in `charts-data.ts`) sums a `valueFn` per category, sorts descending, and folds everything past the top 7 into one `"Other (N categories)"` row, so a 17-category catalogue doesn't render 17 unreadably thin bars. `stockHealthByCategory` is the one exception that shows every category (not top-N + Other) — stock risk needs to be visible per category, not just the biggest ones — and ranks by percent-of-inventory-sold, flagging >=85% as "near sellout" (`StockHealthChartComponent`'s own threshold).

**Time-series charts** (`customerGrowthPoints`, `productsSoldPoints`, `cumulativeGrowthPoints`) read `MonthlyActivityService.activitySignal`, backed by `GET /monthlyActivity` → `usp_getMonthlyActivity`, which returns two result sets in one call (same two-result-set pattern as `usp_getProductDetails`): customers registered per month, then products purchased per month. Each bar chart (`customersJoined`, `productsSold`) has its own Monthly/Yearly toggle (`ChartsComponent.customerGrowthRange`/`productsSoldRange`, a plain `signal<'monthly'|'yearly'>`); `monthlyToPoints`/`yearlyToPoints` (in `charts-data.ts`) reshape the same fetched series client-side — there's no separate yearly endpoint. Cumulative growth has no toggle; `cumulativePoints` always runs a monthly running total. It's registrations over time, **not a currently-active customer count** — it doesn't subtract deletions, so it will overstate the current customer count once any customer has ever been deleted.

**`usp_getMonthlyActivity`'s date handling.** Both source columns are real UTC `DATETIME2(0)`s (`tbl_customers.creation_Date` was an `NVARCHAR` holding `"Sep 22 2026 5:47AM"`-style strings until the data-types pass — see [database](database.md)'s Resolved list). Each result set groups by `DATEFROMPARTS(YEAR(x), MONTH(x), 1)` and returns that first-of-month **`DATE`** as `month_start`; `DbHelper` formats it as the `"yyyy-MM"` `YearMonth` string the UI expects. `FORMAT()` isn't used because it needs CLR, which isn't enabled on Azure SQL Edge (`"Common Language Runtime(CLR) is not enabled on this instance"`). Months are UTC months — a registration at 00:30 local time on the 1st in a UTC+ zone counts toward the previous month.

**No hardcoded chart colors.** Every bar/line uses `var(--spectrumColor2)` (this app's existing primary accent — same green already used for `.btn-primary`/`badge.bg-success`); the "near sellout" flag uses `var(--dangerColor1)` (same color the app already uses for destructive/cautionary UI). Both are single-hue, one-series-at-a-time charts — no categorical multi-color legend anywhere, deliberately: this app's actual palette (`--spectrumColor1/2/3/4`, `--dangerColor1`, `--secondaryColor`) doesn't contain two hues that pass a colorblind-safe categorical pairing at full-size fill, so every chart here is designed to need only one identity color at a time (magnitude via bar length/position, never via a second hue) rather than working around that gap.

**Ranked-bar CSS is global, not per-component.** `RankedBarChartComponent` and `StockHealthChartComponent` share the same row/track/fill markup, so those classes (`.ranked-list`, `.ranked-row`, `.ranked-track`, `.ranked-fill`, etc.) live in `styles.css` next to the app's other shared primitives (`.app-card`, `.empty-state`) rather than being duplicated in two component stylesheets. `StockHealthChartComponent`'s own scoped CSS only adds the `.near-sellout` fill-color override and the flag badge, both specific to that one component.

**Time-series chart tooltips use native SVG `<title>`**, not a hand-rolled hover-tracking/positioning layer — simpler, and free accessibility (the browser's own tooltip). Selective direct labels (the peak bar; the first/last point on the line) are always visible regardless of hover, so the chart reads without a mouse.

## Gotchas / conventions

- If you add a chart that needs a full, unpaginated customer or purchase list (not an aggregate), there isn't one today — `usp_getCustomers` is paginated and there's no `GET /purchases/all` equivalent to the customer-scoped `GET /purchases?customerGuid=`. Don't assume `MonthlyActivityService`'s data can be repurposed for anything other than the two monthly counts it returns.
- `rankByCategory`'s "Other" fold and `stockHealthByCategory`'s no-fold are both deliberate, not inconsistent — see "How it works" above for why stock health shows every category.
- Any new time-series aggregate should follow `usp_getMonthlyActivity`: group by a real `DATE`/`DATETIME2` expression and return a `DATE`, leaving string formatting to the API.
