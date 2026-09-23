CREATE PROCEDURE [dbo].[usp_getCustomer]
    -- Exactly one of these is supplied (the API decides which from the search term's shape),
    -- each typed like the column it's compared with, so no implicit conversion stops a seek.
    @var_Guid UNIQUEIDENTIFIER = NULL,
    @var_MSISDN VARCHAR(15) = NULL,
    @var_Email NVARCHAR(254) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Split by search type (instead of one query with an OR across all three) so the
    -- optimizer can seek the specific unique index for whichever branch actually runs,
    -- rather than compiling one plan that has to cover all three possible predicates.
    IF @var_Guid IS NOT NULL
    BEGIN
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
            a.number
        FROM
            tbl_customers AS c
        INNER JOIN
            tbl_addresses AS a
            ON c.PK_customer_guid = a.FK_customer_guid
        WHERE
            c.PK_customer_guid = @var_Guid;
    END
    ELSE IF @var_MSISDN IS NOT NULL
    BEGIN
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
            a.number
        FROM
            tbl_customers AS c
        INNER JOIN
            tbl_addresses AS a
            ON c.PK_customer_guid = a.FK_customer_guid
        WHERE
            c.msisdn = @var_MSISDN;
    END
    ELSE IF @var_Email IS NOT NULL
    BEGIN
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
            a.number
        FROM
            tbl_customers AS c
        INNER JOIN
            tbl_addresses AS a
            ON c.PK_customer_guid = a.FK_customer_guid
        WHERE
            c.email = @var_Email;
    END
END
