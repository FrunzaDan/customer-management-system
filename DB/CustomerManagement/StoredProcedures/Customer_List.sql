CREATE PROCEDURE [dbo].[Customer_List]
    @PageNumber INT = 1,
    @PageSize INT = 10,
    @SearchTerm NVARCHAR(254) = NULL,
    @SortColumn VARCHAR(20) = 'name',
    @SortDirection VARCHAR(4) = 'asc'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.LastName END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'asc' THEN c.FirstName END ASC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.LastName END DESC,
        CASE WHEN @SortColumn = 'name' AND @SortDirection = 'desc' THEN c.FirstName END DESC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'asc' THEN c.Email END ASC,
        CASE WHEN @SortColumn = 'email' AND @SortDirection = 'desc' THEN c.Email END DESC,
        CASE WHEN @SortColumn = 'phonenumber' AND @SortDirection = 'asc' THEN c.PhoneNumber END ASC,
        CASE WHEN @SortColumn = 'phonenumber' AND @SortDirection = 'desc' THEN c.PhoneNumber END DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
