using System.Globalization;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public sealed record MerchantAuthData(byte[] PasswordHash, byte[] PasswordSalt, MerchantRole MerchantRole);

public static class DbHelper
{
    // usp_createCustomer takes @var_CustomerStatus; usp_editCustomer does not (status is
    // only ever changed via deactivate/reactivate) — so create and edit need separate
    // parameter sets, not one shared method that adds a parameter edit's proc doesn't declare.
    public static void AddCustomerParametersForCreate(SqlCommand command, CreateCustomerRequest customer)
    {
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.Msisdn,
            customer.Gender ?? Gender.NotDeclared, customer.Birthdate);
        command.Parameters.AddSmallInt("@var_CustomerStatus",
            (short)(customer.CustomerStatus ?? CustomerStatus.Active));
        AddAddressParameters(command, customer.Address);
    }

    public static void AddCustomerParametersForEdit(SqlCommand command, UpdateCustomerRequest customer)
    {
        command.Parameters.AddGuid("@var_Guid", customer.Guid);
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.Msisdn,
            customer.Gender, customer.Birthdate);
        AddAddressParameters(command, customer.Address);
    }

    public static void AddProductParametersForCreate(SqlCommand command, CreateProductRequest product)
    {
        command.Parameters.AddNVarChar("@var_Name", FieldLengthConstants.ProductName, product.Name);
        command.Parameters.AddNVarChar("@var_Category", FieldLengthConstants.ProductCategory, product.Category);
        command.Parameters.AddDecimal("@var_Price", 10, 2, product.Price);
        command.Parameters.AddInt("@var_InventoryQuantity", product.InventoryQuantity);
        command.Parameters.AddNVarChar("@var_Depot", FieldLengthConstants.ProductDepot, product.Depot);
        command.Parameters.AddNVarChar("@var_Comment", FieldLengthConstants.ProductComment, product.Comment);
    }

    private static void AddCustomerCoreParameters(SqlCommand command, string? firstName, string? lastName,
        string? email, string? msisdn, Gender? gender, DateOnly? birthdate)
    {
        command.Parameters.AddNVarChar("@var_FirstName", FieldLengthConstants.FirstName, firstName);
        command.Parameters.AddNVarChar("@var_LastName", FieldLengthConstants.LastName, lastName);
        command.Parameters.AddNVarChar("@var_Email", FieldLengthConstants.Email, email);
        command.Parameters.AddVarChar("@var_MSISDN", FieldLengthConstants.Msisdn, msisdn);
        command.Parameters.AddTinyInt("@var_Gender", (byte?)gender);
        command.Parameters.AddDate("@var_Birthdate", birthdate);
    }

    private static void AddAddressParameters(SqlCommand command, AddressRequest? address)
    {
        command.Parameters.AddNVarChar("@var_Country", FieldLengthConstants.Country, address?.Country);
        command.Parameters.AddNVarChar("@var_County", FieldLengthConstants.County, address?.County);
        command.Parameters.AddNVarChar("@var_Town", FieldLengthConstants.Town, address?.Town);
        command.Parameters.AddNVarChar("@var_ZIP", FieldLengthConstants.Zip, address?.Zip);
        command.Parameters.AddNVarChar("@var_Street", FieldLengthConstants.Street, address?.Street);
        command.Parameters.AddNVarChar("@var_Number", FieldLengthConstants.Number, address?.Number);
    }

    public static async Task<ResponseModel<CustomerModel>> HandleResponseWithCustomer(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<CustomerModel>(404, "Customer not found.");

        return new ResponseModel<CustomerModel>(200, "Customer found.", MapCustomerFromReader(reader));
    }

    public static async Task<ResponseModel<PagedResponse<CustomerModel>>> HandleResponseWithPagedCustomers(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        var items = new List<CustomerModel>();
        var totalItems = 0;

        while (await reader.ReadAsync().ConfigureAwait(false))
        {
            if (items.Count == 0)
                totalItems = reader.GetInt32("total_count");

            items.Add(MapCustomerFromReader(reader));
        }

        return new ResponseModel<PagedResponse<CustomerModel>>(200,
            $"{items.Count} customers found (page {pageNumber}).",
            new PagedResponse<CustomerModel>(items, totalItems, pageNumber, pageSize));
    }

    // The standard (result, message) row every mutating proc returns: result 0 = success,
    // anything else is the HTTP status to reply with.
    public static async Task<ResponseModel<object>> HandleResponseWithMessage(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<object>(500, "No data returned or operation failed.");

        var result = reader.GetInt32("result");
        var message = reader.GetNullableString("message");
        return result == 0
            ? new ResponseModel<object>(200, message ?? "Operation successful!")
            : new ResponseModel<object>(result, message ?? "Operation failed.");
    }

    // usp_createCustomer/usp_createProduct return the usual (result, message) row plus the new
    // row's DB-generated key in guidColumn, which is handed back as Data on success.
    public static async Task<ResponseModel<Guid?>> HandleResponseWithCreatedGuid(SqlDataReader reader,
        string guidColumn)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<Guid?>(500, "No data returned or operation failed.");

        var result = reader.GetInt32("result");
        var message = reader.GetNullableString("message");
        return result == 0
            ? new ResponseModel<Guid?>(200, message ?? "Operation successful!", reader.GetNullableGuid(guidColumn))
            : new ResponseModel<Guid?>(result, message ?? "Operation failed.");
    }

    // usp_purchaseProduct returns the usual (result, message) row plus product_name. On
    // success the name comes back as Data (the caller puts it in the audit entry); on any
    // failure it's the plain status + message that HandleResponseWithMessage would give.
    public static async Task<ResponseModel<string>> HandleResponseWithPurchaseResult(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<string>(500, "No data returned or operation failed.");

        var result = reader.GetInt32("result");
        var message = reader.GetNullableString("message");
        return result == 0
            ? new ResponseModel<string>(200, message ?? "Operation successful!",
                reader.GetNullableString("product_name"))
            : new ResponseModel<string>(result, message ?? "Operation failed.");
    }

    public static async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> HandleResponseWithAuditLogList(
        SqlDataReader reader)
    {
        var items = new List<AuditLogEntry>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapAuditLogEntryFromReader(reader));

        return new ResponseModel<IReadOnlyList<AuditLogEntry>>(200, $"{items.Count} audit log entries found.", items);
    }

    public static async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> HandleResponseWithPagedAuditLogList(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        var items = new List<GlobalAuditLogEntry>();
        var totalItems = 0;

        while (await reader.ReadAsync().ConfigureAwait(false))
        {
            if (items.Count == 0)
                totalItems = reader.GetInt32("total_count");

            items.Add(MapGlobalAuditLogEntryFromReader(reader));
        }

        return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200,
            $"{items.Count} audit log entries found (page {pageNumber}).",
            new PagedResponse<GlobalAuditLogEntry>(items, totalItems, pageNumber, pageSize));
    }

    public static async Task<ResponseModel<IReadOnlyList<ProductModel>>> HandleResponseWithProductList(
        SqlDataReader reader)
    {
        var items = new List<ProductModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapProductFromReader(reader));

        return new ResponseModel<IReadOnlyList<ProductModel>>(200, $"{items.Count} products found.", items);
    }

    // usp_getProductDetails returns two result sets: the product (zero rows = not found), then
    // the customers who bought it.
    public static async Task<ResponseModel<ProductDetailsModel>> HandleResponseWithProductDetails(
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

    public static async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> HandleResponseWithPurchaseList(
        SqlDataReader reader)
    {
        var items = new List<PurchaseModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapPurchaseFromReader(reader));

        return new ResponseModel<IReadOnlyList<PurchaseModel>>(200, $"{items.Count} purchases found.", items);
    }

    // usp_getMonthlyActivity returns two result sets: customer registrations by month,
    // then product purchases by month (see that proc).
    public static async Task<ResponseModel<MonthlyActivityModel>> HandleResponseWithMonthlyActivity(
        SqlDataReader reader)
    {
        var registrations = new List<MonthlyCountModel>();
        while (await reader.ReadAsync().ConfigureAwait(false))
            registrations.Add(MapMonthlyCountFromReader(reader, "customer_count"));

        var purchases = new List<MonthlyCountModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            purchases.Add(MapMonthlyCountFromReader(reader, "purchase_count"));

        return new ResponseModel<MonthlyActivityModel>(200, "Monthly activity retrieved.",
            new MonthlyActivityModel { CustomerRegistrations = registrations, ProductPurchases = purchases });
    }

    public static async Task<MerchantAuthData?> HandleMerchantAuthDataResponse(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false)) return null;

        return new MerchantAuthData(
            reader.GetBytes("password_hash"),
            reader.GetBytes("password_salt"),
            (MerchantRole)reader.GetInt16("merchant_role")
        );
    }

    private static CustomerModel MapCustomerFromReader(SqlDataReader reader) => new()
    {
        Guid = reader.GetGuid("PK_customer_guid"),
        FirstName = reader.GetString("first_name"),
        LastName = reader.GetString("last_name"),
        Email = reader.GetString("email"),
        Msisdn = reader.GetString("msisdn"),
        Gender = (Gender)reader.GetByte("gender"),
        Birthdate = reader.GetNullableDateOnly("birthdate"),
        CustomerStatus = (CustomerStatus)reader.GetInt16("customer_Status"),
        CreationDate = reader.GetUtcDateTime("creation_Date"),
        InteractionDate = reader.GetUtcDateTime("interaction_Date"),
        Address = new AddressModel
        {
            Country = reader.GetString("country"),
            County = reader.GetString("county"),
            Town = reader.GetString("town"),
            Zip = reader.GetString("zip_code"),
            Street = reader.GetString("street"),
            Number = reader.GetString("number")
        }
    };

    private static AuditLogEntry MapAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        AuditId = reader.GetInt32("audit_id"),
        CustomerGuid = reader.GetGuid("customer_guid"),
        MerchantId = reader.GetString("merchant_id"),
        Action = Enum.Parse<AuditAction>(reader.GetString("action")),
        Details = reader.GetNullableString("details"),
        ActionDate = reader.GetUtcDateTime("action_Date")
    };

    private static GlobalAuditLogEntry MapGlobalAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        AuditId = reader.GetInt32("audit_id"),
        CustomerGuid = reader.GetGuid("customer_guid"),
        // NULL here (deleted customer, via the proc's LEFT JOIN) must come back as a real null.
        CustomerFirstName = reader.GetNullableString("first_name"),
        CustomerLastName = reader.GetNullableString("last_name"),
        MerchantId = reader.GetString("merchant_id"),
        Action = Enum.Parse<AuditAction>(reader.GetString("action")),
        Details = reader.GetNullableString("details"),
        ActionDate = reader.GetUtcDateTime("action_Date")
    };

    private static ProductModel MapProductFromReader(SqlDataReader reader) => new()
    {
        Guid = reader.GetGuid("PK_product_guid"),
        Name = reader.GetString("product_name"),
        Category = reader.GetString("category"),
        Comment = reader.GetNullableString("comment"),
        Price = reader.GetDecimal("price"),
        InventoryQuantity = reader.GetInt32("inventory_quantity"),
        StockQuantity = reader.GetInt32("stock_quantity"),
        SoldQuantity = reader.GetInt32("sold_quantity"),
        Depot = reader.GetString("depot")
    };

    private static MonthlyCountModel MapMonthlyCountFromReader(SqlDataReader reader, string countColumn) => new()
    {
        YearMonth = reader.GetDateOnly("month_start").ToString("yyyy-MM", CultureInfo.InvariantCulture),
        Count = reader.GetInt32(countColumn)
    };

    private static ProductBuyerModel MapProductBuyerFromReader(SqlDataReader reader) => new()
    {
        PurchaseId = reader.GetInt32("purchase_id"),
        CustomerGuid = reader.GetGuid("FK_customer_guid"),
        CustomerFirstName = reader.GetString("first_name"),
        CustomerLastName = reader.GetString("last_name"),
        CustomerEmail = reader.GetString("email"),
        PurchaseDate = reader.GetUtcDateTime("purchase_date")
    };

    private static PurchaseModel MapPurchaseFromReader(SqlDataReader reader) => new()
    {
        PurchaseId = reader.GetInt32("purchase_id"),
        CustomerGuid = reader.GetGuid("FK_customer_guid"),
        ProductGuid = reader.GetGuid("FK_product_guid"),
        ProductName = reader.GetString("product_name"),
        Category = reader.GetString("category"),
        Price = reader.GetDecimal("price"),
        PurchaseDate = reader.GetUtcDateTime("purchase_date")
    };
}
