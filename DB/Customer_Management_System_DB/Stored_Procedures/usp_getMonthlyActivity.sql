CREATE PROCEDURE [dbo].[usp_getMonthlyActivity]
AS
BEGIN
    SET NOCOUNT ON;

    -- Both result sets return each month as a DATE (the 1st of that month), not a
    -- preformatted string — the API formats it as "yyyy-MM". FORMAT() needs CLR, which
    -- isn't enabled on Azure SQL Edge, and isn't needed anyway: DATEFROMPARTS keeps the
    -- grouping key a real, sortable date.

    -- Result set 1: customers registered per month.
    SELECT
        DATEFROMPARTS(YEAR(creation_Date), MONTH(creation_Date), 1) AS month_start,
        COUNT(*) AS customer_count
    FROM dbo.tbl_customers
    GROUP BY DATEFROMPARTS(YEAR(creation_Date), MONTH(creation_Date), 1)
    ORDER BY month_start;

    -- Result set 2: products purchased per month.
    SELECT
        DATEFROMPARTS(YEAR(purchase_date), MONTH(purchase_date), 1) AS month_start,
        COUNT(*) AS purchase_count
    FROM dbo.tbl_customer_purchases
    GROUP BY DATEFROMPARTS(YEAR(purchase_date), MONTH(purchase_date), 1)
    ORDER BY month_start;
END
