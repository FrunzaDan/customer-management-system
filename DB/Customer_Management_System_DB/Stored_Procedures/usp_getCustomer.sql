CREATE PROCEDURE [dbo].[usp_getCustomer]
    @var_SearchVariable NVARCHAR(50),
    @var_SearchOption INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Split by search type (instead of one query with an OR across all three) so the
    -- optimizer can seek the specific unique index for whichever branch actually runs,
    -- rather than compiling one plan that has to cover all three possible predicates.
    IF @var_SearchOption = 1
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
            c.PK_customer_guid = @var_SearchVariable;
    END
    ELSE IF @var_SearchOption = 2
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
            c.msisdn = @var_SearchVariable;
    END
    ELSE IF @var_SearchOption = 3
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
            c.email = @var_SearchVariable;
    END
END
