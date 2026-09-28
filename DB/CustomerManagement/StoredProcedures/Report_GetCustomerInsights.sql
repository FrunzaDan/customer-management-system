CREATE PROCEDURE [dbo].[Report_GetCustomerInsights]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT
        c.StatusCode,
        c.Gender,
        c.BirthDate,
        c.EnrollmentDate,
        a.County,
        (
            SELECT COUNT(*)
            FROM dbo.CustomerPurchase AS p
            WHERE p.CustomerId = c.CustomerId
        ) AS PurchaseCount
    FROM
        dbo.Customer AS c
    INNER JOIN
        dbo.CustomerAddress AS a
        ON c.CustomerId = a.CustomerId;

    SELECT
        DATEFROMPARTS(YEAR(p.PurchasedAt), MONTH(p.PurchasedAt), 1) AS MonthStart,
        COUNT(*) AS PurchaseCount,
        SUM(pr.Price) AS Revenue
    FROM
        dbo.CustomerPurchase AS p
    INNER JOIN
        dbo.Product AS pr
        ON p.ProductId = pr.ProductId
    GROUP BY DATEFROMPARTS(YEAR(p.PurchasedAt), MONTH(p.PurchasedAt), 1)
    ORDER BY MonthStart;
END
