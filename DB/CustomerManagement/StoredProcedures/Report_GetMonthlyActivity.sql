CREATE PROCEDURE [dbo].[Report_GetMonthlyActivity]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT
        DATEFROMPARTS(YEAR(CreatedAt), MONTH(CreatedAt), 1) AS MonthStart,
        COUNT(*) AS CustomerCount
    FROM dbo.Customer
    GROUP BY DATEFROMPARTS(YEAR(CreatedAt), MONTH(CreatedAt), 1)
    ORDER BY MonthStart;

    SELECT
        DATEFROMPARTS(YEAR(PurchasedAt), MONTH(PurchasedAt), 1) AS MonthStart,
        COUNT(*) AS PurchaseCount
    FROM dbo.CustomerPurchase
    GROUP BY DATEFROMPARTS(YEAR(PurchasedAt), MONTH(PurchasedAt), 1)
    ORDER BY MonthStart;
END
