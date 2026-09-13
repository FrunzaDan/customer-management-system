CREATE PROCEDURE [dbo].[usp_editCustomer]
    @var_Guid NVARCHAR(50),
    @var_FirstName NVARCHAR(50) = NULL,
    @var_LastName NVARCHAR(50) = NULL,
    @var_Email NVARCHAR(50) = NULL,
    @var_MSISDN NVARCHAR(50) = NULL,
    @var_Gender NVARCHAR(50) = NULL,
    @var_Birthdate NVARCHAR(50) = NULL,
    @var_Country NVARCHAR(100) = NULL,
    @var_County NVARCHAR(100) = NULL,
    @var_Town NVARCHAR(50) = NULL,
    @var_ZIP NVARCHAR(50) = NULL,
    @var_Street NVARCHAR(100) = NULL,
    @var_Number NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);
    DECLARE @currDate DATETIME = GETDATE();

    UPDATE tbl_customers
    SET
        interaction_Date = @currDate,
        first_name = ISNULL(@var_FirstName, first_name),
        last_name = ISNULL(@var_LastName, last_name),
        email = ISNULL(@var_Email, email),
        msisdn = ISNULL(@var_MSISDN, msisdn),
        gender = ISNULL(@var_Gender, gender),
        birthdate = ISNULL(@var_Birthdate, birthdate)
    WHERE PK_customer_guid = @var_Guid;

    -- @@ROWCOUNT here replaces a separate IF EXISTS lookup: the UPDATE's WHERE
    -- clause already does the existence check, so a 0 rowcount means not-found
    -- without a second index seek on PK_customer_guid.
    IF @@ROWCOUNT = 0
    BEGIN
        SET @result = 404;
        SET @message = 'Customer not found.';

        SELECT @result AS result, @message AS message;
        RETURN;
    END

    -- Only touch tbl_addresses when the request actually supplied an address
    -- field; otherwise every ISNULL(@param, column) would resolve to the
    -- existing value and this would be a no-op write on every edit call.
    IF @var_Country IS NOT NULL OR @var_County IS NOT NULL OR @var_Town IS NOT NULL
        OR @var_ZIP IS NOT NULL OR @var_Street IS NOT NULL OR @var_Number IS NOT NULL
    BEGIN
        UPDATE tbl_addresses
        SET
            country = ISNULL(@var_Country, country),
            county = ISNULL(@var_County, county),
            town = ISNULL(@var_Town, town),
            zip_code = ISNULL(@var_ZIP, zip_code),
            street = ISNULL(@var_Street, street),
            number = ISNULL(@var_Number, number)
        WHERE FK_customer_guid = @var_Guid;
    END

    SET @result = 0;
    SET @message = 'Customer details updated successfully.';

    SELECT customer_Status AS status, @result AS result, @message AS message
    FROM tbl_customers
    WHERE PK_customer_guid = @var_Guid;
END
