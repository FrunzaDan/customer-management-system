CREATE PROCEDURE [dbo].[Customer_Update]
    @CustomerId UNIQUEIDENTIFIER,
    @FirstName NVARCHAR(100) = NULL,
    @LastName NVARCHAR(100) = NULL,
    @Email NVARCHAR(254) = NULL,
    @PhoneNumber VARCHAR(15) = NULL,
    @Gender TINYINT = NULL,
    @BirthDate DATE = NULL,
    @Country NVARCHAR(100) = NULL,
    @County NVARCHAR(100) = NULL,
    @City NVARCHAR(100) = NULL,
    @PostalCode VARCHAR(20) = NULL,
    @Street NVARCHAR(100) = NULL,
    @StreetNumber NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);
    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    IF NOT EXISTS (SELECT 1 FROM dbo.Customer WHERE CustomerId = @CustomerId)
    BEGIN
        SET @Result = 404;
        SET @Message = 'Customer not found.';

        SELECT @Result AS Result, @Message AS Message;
        RETURN;
    END

    -- Same duplicate pre-check Customer_Create does, excluding the row being edited
    -- itself — without this, an edit that collides with another customer's Email/PhoneNumber
    -- would throw a raw, unhandled UQ_ constraint violation instead of a clean 400.
    IF @Email IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.Customer WHERE Email = @Email AND CustomerId <> @CustomerId
    )
    BEGIN
        SET @Result = 400;
        SET @Message = 'Email already exists.';

        SELECT @Result AS Result, @Message AS Message;
        RETURN;
    END

    IF @PhoneNumber IS NOT NULL AND EXISTS (
        SELECT 1 FROM dbo.Customer WHERE PhoneNumber = @PhoneNumber AND CustomerId <> @CustomerId
    )
    BEGIN
        SET @Result = 400;
        SET @Message = 'Phone number already exists.';

        SELECT @Result AS Result, @Message AS Message;
        RETURN;
    END

    -- Both updates must stay in sync, same reasoning as Customer_Create/Customer_Delete's
    -- TRY/CATCH + transaction: Customer_Get/Customer_List INNER JOIN the two tables, so a
    -- Customer update that commits while the paired CustomerAddress update then fails would
    -- leave the two tables inconsistent.
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.Customer
        SET
            LastInteractionAt = @Now,
            FirstName = ISNULL(@FirstName, FirstName),
            LastName = ISNULL(@LastName, LastName),
            Email = ISNULL(@Email, Email),
            PhoneNumber = ISNULL(@PhoneNumber, PhoneNumber),
            Gender = ISNULL(@Gender, Gender),
            BirthDate = ISNULL(@BirthDate, BirthDate)
        WHERE CustomerId = @CustomerId;

        -- Only touch CustomerAddress when the request actually supplied an address
        -- field; otherwise every ISNULL(@param, column) would resolve to the
        -- existing value and this would be a no-op write on every edit call.
        IF @Country IS NOT NULL OR @County IS NOT NULL OR @City IS NOT NULL
            OR @PostalCode IS NOT NULL OR @Street IS NOT NULL OR @StreetNumber IS NOT NULL
        BEGIN
            UPDATE dbo.CustomerAddress
            SET
                Country = ISNULL(@Country, Country),
                County = ISNULL(@County, County),
                City = ISNULL(@City, City),
                PostalCode = ISNULL(@PostalCode, PostalCode),
                Street = ISNULL(@Street, Street),
                StreetNumber = ISNULL(@StreetNumber, StreetNumber)
            WHERE CustomerId = @CustomerId;
        END

        COMMIT TRANSACTION;

        SET @Result = 0;
        SET @Message = 'Customer details updated successfully.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @Result = 500;
        SET @Message = CONCAT('Failed to update customer: ', ERROR_MESSAGE());
    END CATCH

    SELECT @Result AS Result, @Message AS Message;
END
