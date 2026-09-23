CREATE PROCEDURE [dbo].[usp_getMonthlyActivity]
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: customers registered per month. creation_Date is NVARCHAR, but unlike
    -- birthdate (always 'YYYY-MM-DD', typed by the UI's date input) it's populated by
    -- usp_createCustomer as GETDATE() implicitly converted to NVARCHAR — SQL Server's
    -- default datetime string style ("Sep 22 2026 12:34PM"), not ISO — so it has to be
    -- parsed back to a real date, not substringed. TRY_CONVERT (not CONVERT) so a row
    -- with an unparseable value is skipped instead of failing the whole query — belt and
    -- braces, since every row written by usp_createCustomer is well-formed today.
    SELECT
        CONVERT(CHAR(4), YEAR(c.parsed_date)) + '-' + RIGHT('0' + CONVERT(VARCHAR(2), MONTH(c.parsed_date)), 2)
            AS year_month,
        COUNT(*) AS customer_count
    FROM (
        SELECT TRY_CONVERT(DATETIME, creation_Date) AS parsed_date
        FROM dbo.tbl_customers
    ) c
    WHERE c.parsed_date IS NOT NULL
    GROUP BY YEAR(c.parsed_date), MONTH(c.parsed_date)
    ORDER BY YEAR(c.parsed_date), MONTH(c.parsed_date);

    -- Result set 2: products purchased per month. purchase_date is a real DATETIME,
    -- but FORMAT() needs CLR, which isn't enabled on Azure SQL Edge — build the
    -- "yyyy-MM" key from YEAR()/MONTH() instead.
    SELECT
        CONVERT(CHAR(4), YEAR(purchase_date)) + '-' + RIGHT('0' + CONVERT(VARCHAR(2), MONTH(purchase_date)), 2)
            AS year_month,
        COUNT(*) AS purchase_count
    FROM dbo.tbl_customer_purchases
    GROUP BY YEAR(purchase_date), MONTH(purchase_date)
    ORDER BY YEAR(purchase_date), MONTH(purchase_date);
END
