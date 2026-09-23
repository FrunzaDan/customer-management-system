CREATE PROCEDURE [dbo].[Customer_Create]
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @Email NVARCHAR(254),
    @PhoneNumber VARCHAR(15),
    @Gender TINYINT = 0,
    @BirthDate DATE = NULL,
    @Country NVARCHAR(100),
    @County NVARCHAR(100),
    @City NVARCHAR(100),
    @PostalCode VARCHAR(20),
    @Street NVARCHAR(100),
    @StreetNumber NVARCHAR(50),
    @StatusCode SMALLINT = 1901
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);
    DECLARE @CustomerId UNIQUEIDENTIFIER = NULL;
    DECLARE @Inserted TABLE (CustomerId UNIQUEIDENTIFIER);

    IF EXISTS (SELECT 1 FROM dbo.Customer WHERE PhoneNumber = @PhoneNumber)
    BEGIN
        SET @Result = 400;  -- Phone number already exists
        SET @Message = 'Phone number already exists.';
    END
    ELSE IF EXISTS (SELECT 1 FROM dbo.Customer WHERE Email = @Email)
    BEGIN
        SET @Result = 400;  -- Email already exists
        SET @Message = 'Email already exists.';
    END
    ELSE
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Both inserts must succeed together: Customer_Get/Customer_List INNER JOIN
            -- to CustomerAddress, so a customer row left without a matching address row would
            -- silently disappear from every read despite existing in Customer.
            -- CustomerId, CreatedAt and LastInteractionAt come from the table's
            -- defaults (NEWSEQUENTIALID() / SYSUTCDATETIME()); OUTPUT captures the new key.
            INSERT INTO dbo.Customer
            (
                FirstName, LastName, Email, PhoneNumber, Gender, BirthDate, StatusCode
            )
            OUTPUT inserted.CustomerId INTO @Inserted
            VALUES
            (
                @FirstName, @LastName, @Email, @PhoneNumber,
                @Gender, @BirthDate, @StatusCode
            );

            SELECT @CustomerId = CustomerId FROM @Inserted;

            INSERT INTO dbo.CustomerAddress
            (
                CustomerId, Country, County, City, PostalCode, Street, StreetNumber
            )
            VALUES
            (
                @CustomerId, @Country, @County, @City, @PostalCode, @Street, @StreetNumber
            );

            COMMIT TRANSACTION;

            SET @Result = 0;
            SET @Message = 'Customer created successfully.';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @CustomerId = NULL;
            SET @Result = 500;
            SET @Message = CONCAT('Failed to create customer: ', ERROR_MESSAGE());
        END CATCH
    END

    -- CustomerId rides along on the usual (Result, Message) row so the API can return the
    -- new customer's server-generated key; only meaningful when Result = 0.
    SELECT @Result AS Result, @Message AS Message, @CustomerId AS CustomerId;
END
