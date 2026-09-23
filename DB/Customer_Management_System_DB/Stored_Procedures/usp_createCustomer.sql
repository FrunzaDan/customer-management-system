CREATE PROCEDURE [dbo].[usp_createCustomer]
    @var_FirstName NVARCHAR(50),
    @var_LastName NVARCHAR(50),
    @var_Email NVARCHAR(254),
    @var_MSISDN VARCHAR(15),
    @var_Gender TINYINT = 0,
    @var_Birthdate DATE = NULL,
    @var_Country NVARCHAR(100),
    @var_County NVARCHAR(100),
    @var_Town NVARCHAR(50),
    @var_ZIP NVARCHAR(50),
    @var_Street NVARCHAR(100),
    @var_Number NVARCHAR(50),
    @var_CustomerStatus SMALLINT = 1901
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);
    DECLARE @customerGuid UNIQUEIDENTIFIER = NULL;
    DECLARE @inserted TABLE (customer_guid UNIQUEIDENTIFIER);

    IF EXISTS (SELECT 1 FROM tbl_customers WHERE msisdn = @var_MSISDN)
    BEGIN
        SET @result = 400;  -- MSISDN already exists
        SET @message = 'MSISDN already exists.';
    END
    ELSE IF EXISTS (SELECT 1 FROM tbl_customers WHERE email = @var_Email)
    BEGIN
        SET @result = 400;  -- Email already exists
        SET @message = 'Email already exists.';
    END
    ELSE
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Both inserts must succeed together: usp_getCustomer/usp_getCustomers INNER JOIN
            -- to tbl_addresses, so a customer row left without a matching address row would
            -- silently disappear from every read despite existing in tbl_customers.
            -- PK_customer_guid, creation_Date and interaction_Date come from the table's
            -- defaults (NEWSEQUENTIALID() / SYSUTCDATETIME()); OUTPUT captures the new key.
            INSERT INTO dbo.tbl_customers
            (
                first_name, last_name, email, msisdn, gender, birthdate, customer_Status
            )
            OUTPUT inserted.PK_customer_guid INTO @inserted
            VALUES
            (
                @var_FirstName, @var_LastName, @var_Email, @var_MSISDN,
                @var_Gender, @var_Birthdate, @var_CustomerStatus
            );

            SELECT @customerGuid = customer_guid FROM @inserted;

            INSERT INTO dbo.tbl_addresses
            (
                FK_customer_guid, country, county, town, zip_code, street, number
            )
            VALUES
            (
                @customerGuid, @var_Country, @var_County, @var_Town, @var_ZIP, @var_Street, @var_Number
            );

            COMMIT TRANSACTION;

            SET @result = 0;
            SET @message = 'Customer created successfully.';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @customerGuid = NULL;
            SET @result = 500;
            SET @message = CONCAT('Failed to create customer: ', ERROR_MESSAGE());
        END CATCH
    END

    -- customer_guid rides along on the usual (result, message) row so the API can return the
    -- new customer's server-generated key; only meaningful when result = 0.
    SELECT @result AS result, @message AS message, @customerGuid AS customer_guid;
END
