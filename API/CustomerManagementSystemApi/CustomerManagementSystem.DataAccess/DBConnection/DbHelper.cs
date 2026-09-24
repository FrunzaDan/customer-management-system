using System.Globalization;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public sealed record MerchantAuthData(byte[] PasswordHash, byte[] PasswordSalt, MerchantRole MerchantRole);

public static class DbHelper
{
    // Customer_Create takes @StatusCode; Customer_Update does not (status is
    // only ever changed via deactivate/reactivate) — so create and edit need separate
    // parameter sets, not one shared method that adds a parameter edit's proc doesn't declare.
    public static void AddCustomerParametersForCreate(SqlCommand command, CreateCustomerRequest customer)
    {
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.PhoneNumber,
            customer.Gender ?? Gender.NotDeclared, customer.BirthDate);
        command.Parameters.AddSmallInt("@StatusCode",
            (short)(customer.Status ?? CustomerStatus.Active));
        AddAddressParameters(command, customer.Address);
    }

    public static void AddCustomerParametersForUpdate(SqlCommand command, UpdateCustomerRequest customer)
    {
        command.Parameters.AddGuid("@CustomerId", customer.CustomerId);
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.PhoneNumber,
            customer.Gender, customer.BirthDate);
        AddAddressParameters(command, customer.Address);
    }

    public static void AddProductParametersForCreate(SqlCommand command, CreateProductRequest product)
    {
        command.Parameters.AddNVarChar("@Name", FieldLengthConstants.ProductName, product.Name);
        command.Parameters.AddNVarChar("@Category", FieldLengthConstants.ProductCategory, product.Category);
        command.Parameters.AddDecimal("@Price", 12, 2, product.Price);
        command.Parameters.AddInt("@InitialQuantity", product.InitialQuantity);
        command.Parameters.AddNVarChar("@Warehouse", FieldLengthConstants.ProductWarehouse, product.Warehouse);
        command.Parameters.AddNVarChar("@Description", FieldLengthConstants.ProductDescription, product.Description);
    }

    private static void AddCustomerCoreParameters(SqlCommand command, string? firstName, string? lastName,
        string? email, string? phoneNumber, Gender? gender, DateOnly? birthDate)
    {
        command.Parameters.AddNVarChar("@FirstName", FieldLengthConstants.FirstName, firstName);
        command.Parameters.AddNVarChar("@LastName", FieldLengthConstants.LastName, lastName);
        command.Parameters.AddNVarChar("@Email", FieldLengthConstants.Email, email);
        command.Parameters.AddVarChar("@PhoneNumber", FieldLengthConstants.PhoneNumber, phoneNumber);
        command.Parameters.AddTinyInt("@Gender", (byte?)gender);
        command.Parameters.AddDate("@BirthDate", birthDate);
    }

    private static void AddAddressParameters(SqlCommand command, AddressRequest? address)
    {
        command.Parameters.AddNVarChar("@Country", FieldLengthConstants.Country, address?.Country);
        command.Parameters.AddNVarChar("@County", FieldLengthConstants.County, address?.County);
        command.Parameters.AddNVarChar("@City", FieldLengthConstants.City, address?.City);
        command.Parameters.AddNVarChar("@PostalCode", FieldLengthConstants.PostalCode, address?.PostalCode);
        command.Parameters.AddNVarChar("@Street", FieldLengthConstants.Street, address?.Street);
        command.Parameters.AddNVarChar("@StreetNumber", FieldLengthConstants.StreetNumber, address?.StreetNumber);
    }

    public static async Task<ResponseModel<CustomerModel>> HandleResponseWithCustomerAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<CustomerModel>(404, "Customer not found.");

        return new ResponseModel<CustomerModel>(200, "Customer found.", MapCustomerFromReader(reader));
    }

    public static async Task<ResponseModel<PagedResponse<CustomerModel>>> HandleResponseWithPagedCustomersAsync(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        var items = new List<CustomerModel>();
        var totalItems = 0;

        while (await reader.ReadAsync().ConfigureAwait(false))
        {
            if (items.Count == 0)
                totalItems = reader.GetInt32("TotalCount");

            items.Add(MapCustomerFromReader(reader));
        }

        return new ResponseModel<PagedResponse<CustomerModel>>(200,
            $"{items.Count} customers found (page {pageNumber}).",
            new PagedResponse<CustomerModel>(items, totalItems, pageNumber, pageSize));
    }

    // The standard (Result, Message) row every mutating proc returns: Result 0 = success,
    // anything else is the HTTP status to reply with.
    public static async Task<ResponseModel<object>> HandleResponseWithMessageAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<object>(200, message ?? "Operation successful!")
            : new ResponseModel<object>(result, message ?? "Operation failed.");
    }

    // Customer_Create/Product_Create return the usual (Result, Message) row plus the new
    // row's DB-generated key in guidColumn, which is handed back as Data on success.
    public static async Task<ResponseModel<Guid?>> HandleResponseWithCreatedGuidAsync(SqlDataReader reader,
        string guidColumn)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<Guid?>(200, message ?? "Operation successful!", reader.GetNullableGuid(guidColumn))
            : new ResponseModel<Guid?>(result, message ?? "Operation failed.");
    }

    // CustomerPurchase_Create returns the usual (Result, Message) row plus ProductName. On
    // success the name comes back as Data (the caller puts it in the audit entry); on any
    // failure it's the plain status + message that HandleResponseWithMessage would give.
    public static async Task<ResponseModel<string>> HandleResponseWithPurchaseResultAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<string>(200, message ?? "Operation successful!",
                reader.GetNullableString("ProductName"))
            : new ResponseModel<string>(result, message ?? "Operation failed.");
    }

    public static async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> HandleResponseWithAuditLogListAsync(
        SqlDataReader reader)
    {
        var items = new List<AuditLogEntry>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapAuditLogEntryFromReader(reader));

        return new ResponseModel<IReadOnlyList<AuditLogEntry>>(200, $"{items.Count} audit log entries found.", items);
    }

    // CustomerAuditLog_List returns two result sets: the total (one row), then the page. The total
    // comes first, on its own, so it's right even when the page is empty.
    public static async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> HandleResponseWithPagedAuditLogListAsync(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        await reader.ReadAsync().ConfigureAwait(false);
        var totalItems = reader.GetInt32("TotalCount");

        var items = new List<GlobalAuditLogEntry>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapGlobalAuditLogEntryFromReader(reader));

        return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200,
            $"{items.Count} audit log entries found (page {pageNumber}).",
            new PagedResponse<GlobalAuditLogEntry>(items, totalItems, pageNumber, pageSize));
    }

    public static async Task<ResponseModel<IReadOnlyList<ProductModel>>> HandleResponseWithProductListAsync(
        SqlDataReader reader)
    {
        var items = new List<ProductModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapProductFromReader(reader));

        return new ResponseModel<IReadOnlyList<ProductModel>>(200, $"{items.Count} products found.", items);
    }

    // Product_GetDetails returns two result sets: the product (zero rows = not found), then
    // the customers who bought it.
    public static async Task<ResponseModel<ProductDetailsModel>> HandleResponseWithProductDetailsAsync(
        SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<ProductDetailsModel>(404, "Product not found.");

        var product = MapProductFromReader(reader);

        var buyers = new List<ProductBuyerModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            buyers.Add(MapProductBuyerFromReader(reader));

        return new ResponseModel<ProductDetailsModel>(200, "Product found.",
            new ProductDetailsModel { Product = product, Buyers = buyers });
    }

    public static async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> HandleResponseWithPurchaseListAsync(
        SqlDataReader reader)
    {
        var items = new List<PurchaseModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapPurchaseFromReader(reader));

        return new ResponseModel<IReadOnlyList<PurchaseModel>>(200, $"{items.Count} purchases found.", items);
    }

    // Report_GetMonthlyActivity returns two result sets: customer registrations by month,
    // then product purchases by month (see that proc).
    public static async Task<ResponseModel<MonthlyActivityModel>> HandleResponseWithMonthlyActivityAsync(
        SqlDataReader reader)
    {
        var registrations = new List<MonthlyCountModel>();
        while (await reader.ReadAsync().ConfigureAwait(false))
            registrations.Add(MapMonthlyCountFromReader(reader, "CustomerCount"));

        var purchases = new List<MonthlyCountModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            purchases.Add(MapMonthlyCountFromReader(reader, "PurchaseCount"));

        return new ResponseModel<MonthlyActivityModel>(200, "Monthly activity retrieved.",
            new MonthlyActivityModel { CustomerCreations = registrations, ProductPurchases = purchases });
    }

    public static async Task<MerchantAuthData?> HandleMerchantAuthDataResponseAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false)) return null;

        return new MerchantAuthData(
            reader.GetBytes("PasswordHash"),
            reader.GetBytes("PasswordSalt"),
            (MerchantRole)reader.GetInt16("RoleCode")
        );
    }

    private static CustomerModel MapCustomerFromReader(SqlDataReader reader) => new()
    {
        CustomerId = reader.GetGuid("CustomerId"),
        FirstName = reader.GetString("FirstName"),
        LastName = reader.GetString("LastName"),
        Email = reader.GetString("Email"),
        PhoneNumber = reader.GetString("PhoneNumber"),
        Gender = (Gender)reader.GetByte("Gender"),
        BirthDate = reader.GetNullableDateOnly("BirthDate"),
        Status = (CustomerStatus)reader.GetInt16("StatusCode"),
        CreatedAt = reader.GetUtcDateTime("CreatedAt"),
        LastInteractionAt = reader.GetUtcDateTime("LastInteractionAt"),
        Address = new AddressModel
        {
            Country = reader.GetString("Country"),
            County = reader.GetString("County"),
            City = reader.GetString("City"),
            PostalCode = reader.GetString("PostalCode"),
            Street = reader.GetString("Street"),
            StreetNumber = reader.GetString("StreetNumber")
        }
    };

    private static AuditLogEntry MapAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        CustomerAuditLogId = reader.GetInt32("CustomerAuditLogId"),
        CustomerId = reader.GetGuid("CustomerId"),
        PerformedBy = reader.GetString("PerformedBy"),
        ActionType = Enum.Parse<AuditAction>(reader.GetString("ActionType")),
        Details = reader.GetNullableString("Details"),
        OccurredAt = reader.GetUtcDateTime("OccurredAt")
    };

    private static GlobalAuditLogEntry MapGlobalAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        CustomerAuditLogId = reader.GetInt32("CustomerAuditLogId"),
        CustomerId = reader.GetGuid("CustomerId"),
        // NULL here (deleted customer, via the proc's LEFT JOIN) must come back as a real null.
        CustomerFirstName = reader.GetNullableString("FirstName"),
        CustomerLastName = reader.GetNullableString("LastName"),
        PerformedBy = reader.GetString("PerformedBy"),
        ActionType = Enum.Parse<AuditAction>(reader.GetString("ActionType")),
        Details = reader.GetNullableString("Details"),
        OccurredAt = reader.GetUtcDateTime("OccurredAt")
    };

    private static ProductModel MapProductFromReader(SqlDataReader reader) => new()
    {
        ProductId = reader.GetGuid("ProductId"),
        Name = reader.GetString("Name"),
        Category = reader.GetString("Category"),
        Description = reader.GetNullableString("Description"),
        Price = reader.GetDecimal("Price"),
        InitialQuantity = reader.GetInt32("InitialQuantity"),
        QuantityOnHand = reader.GetInt32("QuantityOnHand"),
        SoldQuantity = reader.GetInt32("SoldQuantity"),
        Warehouse = reader.GetString("Warehouse")
    };

    private static MonthlyCountModel MapMonthlyCountFromReader(SqlDataReader reader, string countColumn) => new()
    {
        YearMonth = reader.GetDateOnly("MonthStart").ToString("yyyy-MM", CultureInfo.InvariantCulture),
        Count = reader.GetInt32(countColumn)
    };

    private static ProductBuyerModel MapProductBuyerFromReader(SqlDataReader reader) => new()
    {
        CustomerPurchaseId = reader.GetInt32("CustomerPurchaseId"),
        CustomerId = reader.GetGuid("CustomerId"),
        CustomerFirstName = reader.GetString("FirstName"),
        CustomerLastName = reader.GetString("LastName"),
        CustomerEmail = reader.GetString("Email"),
        PurchasedAt = reader.GetUtcDateTime("PurchasedAt")
    };

    private static PurchaseModel MapPurchaseFromReader(SqlDataReader reader) => new()
    {
        CustomerPurchaseId = reader.GetInt32("CustomerPurchaseId"),
        CustomerId = reader.GetGuid("CustomerId"),
        ProductId = reader.GetGuid("ProductId"),
        ProductName = reader.GetString("ProductName"),
        Category = reader.GetString("Category"),
        Price = reader.GetDecimal("Price"),
        PurchasedAt = reader.GetUtcDateTime("PurchasedAt")
    };
}
