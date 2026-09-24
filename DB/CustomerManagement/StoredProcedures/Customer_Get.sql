CREATE PROCEDURE [dbo].[Customer_Get]
    -- Exactly one of these is supplied (the API decides which from the search term's shape),
    -- each typed like the column it's compared with, so no implicit conversion stops a seek.
    @CustomerId UNIQUEIDENTIFIER = NULL,
    @PhoneNumber VARCHAR(15) = NULL,
    @Email NVARCHAR(254) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Split by search type (instead of one query with an OR across all three) so the
    -- optimizer can seek the specific unique index for whichever branch actually runs,
    -- rather than compiling one plan that has to cover all three possible predicates.
    IF @CustomerId IS NOT NULL
    BEGIN
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
            a.StreetNumber
        FROM
            dbo.Customer AS c
        INNER JOIN
            dbo.CustomerAddress AS a
            ON c.CustomerId = a.CustomerId
        WHERE
            c.CustomerId = @CustomerId;
    END
    ELSE IF @PhoneNumber IS NOT NULL
    BEGIN
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
            a.StreetNumber
        FROM
            dbo.Customer AS c
        INNER JOIN
            dbo.CustomerAddress AS a
            ON c.CustomerId = a.CustomerId
        WHERE
            c.PhoneNumber = @PhoneNumber;
    END
    ELSE IF @Email IS NOT NULL
    BEGIN
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
            a.StreetNumber
        FROM
            dbo.Customer AS c
        INNER JOIN
            dbo.CustomerAddress AS a
            ON c.CustomerId = a.CustomerId
        WHERE
            c.Email = @Email;
    END
END
