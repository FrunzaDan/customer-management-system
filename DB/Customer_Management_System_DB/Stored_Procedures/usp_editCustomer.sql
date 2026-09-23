CREATE PROCEDURE [dbo].[usp_editCustomer]
    @var_Guid UNIQUEIDENTIFIER,
    @var_FirstName NVARCHAR(50) = NULL,
    @var_LastName NVARCHAR(50) = NULL,
    @var_Email NVARCHAR(254) = NULL,
    @var_MSISDN VARCHAR(15) = NULL,
    @var_Gender TINYINT = NULL,
    @var_Birthdate DATE = NULL,
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
    DECLARE @currDate DATETIME2(0) = SYSUTCDATETIME();

    IF NOT EXISTS (SELECT 1 FROM tbl_customers WHERE PK_customer_guid = @var_Guid)
    BEGIN
        SET @result = 404;
        SET @message = 'Customer not found.';

        SELECT @result AS result, @message AS message;
        RETURN;
    END

    -- Same duplicate pre-check usp_createCustomer does, excluding the row being edited
    -- itself — without this, an edit that collides with another customer's email/msisdn
    -- would throw a raw, unhandled UQ_ constraint violation instead of a clean 400.
    IF @var_Email IS NOT NULL AND EXISTS (
        SELECT 1 FROM tbl_customers WHERE email = @var_Email AND PK_customer_guid <> @var_Guid
    )
    BEGIN
        SET @result = 400;
        SET @message = 'Email already exists.';

        SELECT @result AS result, @message AS message;
        RETURN;
    END

    IF @var_MSISDN IS NOT NULL AND EXISTS (
        SELECT 1 FROM tbl_customers WHERE msisdn = @var_MSISDN AND PK_customer_guid <> @var_Guid
    )
    BEGIN
        SET @result = 400;
        SET @message = 'MSISDN already exists.';

        SELECT @result AS result, @message AS message;
        RETURN;
    END

    -- Both updates must stay in sync, same reasoning as usp_createCustomer/usp_deleteCustomer's
    -- TRY/CATCH + transaction: usp_getCustomer/usp_getCustomers INNER JOIN the two tables, so a
    -- tbl_customers update that commits while the paired tbl_addresses update then fails would
    -- leave the two tables inconsistent.
    BEGIN TRY
        BEGIN TRANSACTION;

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

        COMMIT TRANSACTION;

        SET @result = 0;
        SET @message = 'Customer details updated successfully.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @result = 500;
        SET @message = CONCAT('Failed to update customer: ', ERROR_MESSAGE());
    END CATCH

    SELECT @result AS result, @message AS message;
END
