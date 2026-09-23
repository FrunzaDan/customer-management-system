namespace CustomerManagementSystem.Domain.Constants;

// Mirrors the column lengths declared in DB/.../Tables/Customer.sql and
// CustomerAddress.sql. Lives in Domain (not BusinessLogic) because both layers need it:
// BusinessLogic rejects an over-length value with a clean 400 instead of an opaque SQL
// truncation error, and DataAccess sizes its SqlParameters to match the proc parameters.
public static class FieldLengthConstants
{
    public const int FirstName = 100;
    public const int LastName = 100;
    public const int Email = 254;
    public const int PhoneNumber = 15;

    public const int Country = 100;
    public const int County = 100;
    public const int City = 100;
    public const int PostalCode = 20;
    public const int Street = 100;
    public const int StreetNumber = 50;

    // Mirrors Product.sql.
    public const int ProductName = 100;
    public const int ProductCategory = 50;
    public const int ProductDescription = 500;
    public const int ProductWarehouse = 100;

    // Mirrors Merchant.sql / CustomerAuditLog.sql.
    public const int Username = 50;
    public const int AuditAction = 20;
    public const int AuditDetails = 500;

    // Mirrors Customer_List' parameters.
    public const int SearchTerm = 254;
    public const int SortColumn = 20;
    public const int SortDirection = 4;
}
