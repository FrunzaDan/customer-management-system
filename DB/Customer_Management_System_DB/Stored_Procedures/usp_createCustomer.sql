CREATE PROCEDURE [dbo].[usp_createCustomer]
    @var_Guid NVARCHAR(50),
    @var_FirstName NVARCHAR(50),
    @var_LastName NVARCHAR(50),
    @var_Email NVARCHAR(50),
    @var_MSISDN NVARCHAR(50),
    @var_Gender INT,
    @var_Birthdate NVARCHAR(50),
    @var_Country NVARCHAR(100),
    @var_County NVARCHAR(100),
    @var_Town NVARCHAR(50),
    @var_ZIP NVARCHAR(50),
    @var_Street NVARCHAR(100),
    @var_Number NVARCHAR(50),
    @var_CustomerStatus INT = 1901
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);
    DECLARE @currentDateTime DATETIME = GETDATE();

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
            INSERT INTO dbo.tbl_customers
            (
                PK_customer_guid, first_name, last_name, email, msisdn,
                gender, birthdate, customer_Status, creation_Date, interaction_Date
            )
            VALUES
            (
                @var_Guid, @var_FirstName, @var_LastName, @var_Email, @var_MSISDN,
                @var_Gender, @var_Birthdate, @var_CustomerStatus, @currentDateTime, @currentDateTime
            );

            INSERT INTO dbo.tbl_addresses
            (
                FK_customer_guid, country, county, town, zip_code, street, number
            )
            VALUES
            (
                @var_Guid, @var_Country, @var_County, @var_Town, @var_ZIP, @var_Street, @var_Number
            );

            COMMIT TRANSACTION;

            SET @result = 0;
            SET @message = CONCAT('Customer created successfully. GUID: ', @var_Guid);
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @result = 500;
            SET @message = CONCAT('Failed to create customer: ', ERROR_MESSAGE());
        END CATCH
    END

    SELECT @result AS result, @message AS message;
END
