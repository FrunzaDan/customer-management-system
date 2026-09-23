CREATE PROCEDURE [dbo].[Customer_List]
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
        c.CustomerId,
        c.FirstName,
        c.LastName,
        c.Email,
        c.PhoneNumber,
        c.Gender,
        c.BirthDate,
        c.StatusCode,
        c.CreatedAt,
        c.LastInteractionAt,
        a.Country,
        a.County,
        a.City,
        a.PostalCode,
        a.Street,
        a.StreetNumber,
        COUNT(*) OVER() AS TotalCount
    FROM
        dbo.Customer AS c
    INNER JOIN
        dbo.CustomerAddress AS a
        ON c.CustomerId = a.CustomerId
    WHERE
        @SearchTerm IS NULL
        OR c.FirstName LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.LastName LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.Email LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
        OR c.PhoneNumber LIKE '%' + @EscapedSearchTerm + '%' ESCAPE '\'
    ORDER BY
        -- Parameterized sorting without dynamic SQL: for a given
        -- @SortColumn/@SortDirection, exactly one pair of CASE expressions
        -- below evaluates to non-NULL for every row, so it's the only pair
        -- that actually influences row order — the rest are NULL for every
        -- row and are no-ops. Ties within name always break by FirstName.
        -- The sort keys ('name', 'email', 'msisdn') are the API's CustomerSortColumn
        -- values, not column names.
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.LastName END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.FirstName END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.LastName END DESC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.FirstName END DESC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'asc' THEN c.Email END ASC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'desc' THEN c.Email END DESC,
        CASE WHEN @SortColumn = 'msisdn' AND @SortDirection = 'asc' THEN c.PhoneNumber END ASC,
        CASE WHEN @SortColumn = 'msisdn' AND @SortDirection = 'desc' THEN c.PhoneNumber END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
