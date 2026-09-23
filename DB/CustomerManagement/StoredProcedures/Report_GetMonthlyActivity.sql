CREATE PROCEDURE [dbo].[Report_GetMonthlyActivity]
AS
BEGIN
    SET NOCOUNT ON;

    -- Both result sets return each month as a DATE (the 1st of that month), not a
    -- preformatted string — the API formats it as "yyyy-MM". FORMAT() needs CLR, which
    -- isn't enabled on Azure SQL Edge, and isn't needed anyway: DATEFROMPARTS keeps the
    -- grouping key a real, sortable date.

    -- Result set 1: customers registered per month.
    SELECT
        DATEFROMPARTS(YEAR(CreatedAt), MONTH(CreatedAt), 1) AS MonthStart,
        COUNT(*) AS CustomerCount
    FROM dbo.Customer
    GROUP BY DATEFROMPARTS(YEAR(CreatedAt), MONTH(CreatedAt), 1)
    ORDER BY MonthStart;

    -- Result set 2: products purchased per month.
    SELECT
        DATEFROMPARTS(YEAR(PurchasedAt), MONTH(PurchasedAt), 1) AS MonthStart,
        COUNT(*) AS PurchaseCount
    FROM dbo.CustomerPurchase
    GROUP BY DATEFROMPARTS(YEAR(PurchasedAt), MONTH(PurchasedAt), 1)
    ORDER BY MonthStart;
END
