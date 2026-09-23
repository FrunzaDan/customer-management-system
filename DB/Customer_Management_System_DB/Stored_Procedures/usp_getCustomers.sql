CREATE PROCEDURE [dbo].[usp_getCustomers]
    @PageNumber INT = 1,
    @PageSize INT = 10,
    @SearchTerm NVARCHAR(254) = NULL,
    @SortColumn VARCHAR(10) = 'name',
    @SortDirection VARCHAR(4) = 'asc'
AS
BEGIN
    SET NOCOUNT ON;

    -- % and _ are LIKE wildcards; a literal search for either would otherwise match far
    -- more than the user typed (e.g. a search for "_" matching almost every customer).
    -- Still fully parameterized (no string concatenation of SQL) — this only escapes the
    -- pattern characters inside the parameter's own value.
    DECLARE @EscapedSearchTerm NVARCHAR(508) =
        REPLACE(REPLACE(REPLACE(@SearchTerm, '\', '\\'), '%', '\%'), '_', '\_');

    SELECT
        c.PK_customer_guid,
        c.first_name,
        c.last_name,
        c.email,
        c.msisdn,
        c.gender,
        c.birthdate,
        c.customer_Status,
        c.creation_Date,
        c.interaction_Date,
        a.country,
        a.county,
        a.town,
        a.zip_code,
        a.street,
        a.number,
        COUNT(*) OVER() AS total_count
    FROM
        tbl_customers AS c
    INNER JOIN
        tbl_addresses AS a
        ON c.PK_customer_guid = a.FK_customer_guid
    WHERE
        @SearchTerm IS NULL
        OR c.first_name LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.last_name LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.email LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.msisdn LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
    ORDER BY
        -- Parameterized sorting without dynamic SQL: for a given
        -- @SortColumn/@SortDirection, exactly one pair of CASE expressions
        -- below evaluates to non-NULL for every row, so it's the only pair
        -- that actually influences row order — the rest are NULL for every
        -- row and are no-ops. Ties within name always break by first_name.
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.last_name END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.first_name END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.last_name END DESC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.first_name END DESC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'asc' THEN c.email END ASC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'desc' THEN c.email END DESC,
        CASE WHEN @SortColumn = 'msisdn' AND @SortDirection = 'asc' THEN c.msisdn END ASC,
        CASE WHEN @SortColumn = 'msisdn' AND @SortDirection = 'desc' THEN c.msisdn END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
