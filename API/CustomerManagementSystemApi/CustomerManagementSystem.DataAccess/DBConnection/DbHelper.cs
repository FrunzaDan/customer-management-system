using System.Data;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public sealed record MerchantAuthData(byte[] PasswordHash, byte[] PasswordSalt, int? MerchantRole);

public static class DbHelper
{
    // usp_createCustomer takes @var_CustomerStatus; usp_editCustomer does not (status is
    // only ever changed via deactivate/reactivate) — so create and edit need separate
    // parameter sets, not one shared method that adds a parameter edit's proc doesn't declare.
    public static void AddCustomerParametersForCreate(SqlCommand command, CustomerModel customer)
    {
        AddCustomerCoreParameters(command, customer);
        command.Parameters.AddWithValue("@var_CustomerStatus", customer.CustomerStatus ?? CustomerStatusCodes.Active);
        AddAddressParameters(command, customer.Address);
    }

    public static void AddCustomerParametersForEdit(SqlCommand command, CustomerModel customer)
    {
        AddCustomerCoreParameters(command, customer);
        AddAddressParameters(command, customer.Address);
    }

    private static void AddCustomerCoreParameters(SqlCommand command, CustomerModel customer)
    {
        command.Parameters.AddWithValue("@var_Guid", customer.Guid);
        command.Parameters.AddWithValue("@var_FirstName", customer.FirstName);
        command.Parameters.AddWithValue("@var_LastName", customer.LastName);
        command.Parameters.AddWithValue("@var_Email", customer.Email);
        command.Parameters.AddWithValue("@var_MSISDN", customer.Msisdn);
        command.Parameters.Add("@var_Gender", SqlDbType.Int).Value = (object?)customer.Gender ?? DBNull.Value;
        command.Parameters.AddWithValue("@var_Birthdate", customer.Birthdate);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithCustomerMapping(SqlDataReader reader,
        string successMessage, string failureMessage)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<object>(404, failureMessage);

        return new ResponseModel<object>(200, successMessage, MapCustomerFromReader(reader));
    }

    public static async Task<ResponseModel<object>> HandleResponseWithList(SqlDataReader reader, string entityName)
    {
        var items = new List<object>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapCustomerFromReader(reader));

        return new ResponseModel<object>(200, $"{items.Count} {entityName} found.", items);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithPagedList(SqlDataReader reader,
        int pageNumber, int pageSize, string entityName)
    {
        var items = new List<CustomerModel>();
        var totalItems = 0;

        while (await reader.ReadAsync().ConfigureAwait(false))
        {
            if (items.Count == 0)
                totalItems = Convert.ToInt32(reader["total_count"]);

            items.Add(MapCustomerFromReader(reader));
        }

        var pagedResponse = new PagedResponse<CustomerModel>(items, totalItems, pageNumber, pageSize);
        return new ResponseModel<object>(200, $"{items.Count} {entityName} found (page {pageNumber}).",
            pagedResponse);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithMessage(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<object>(500, "No data returned or operation failed.");

        var message = reader["message"] as string;
        return reader["result"] is 0
            ? new ResponseModel<object>(200, message ?? "Operation successful!")
            : new ResponseModel<object>(Convert.ToInt32(reader["result"]), message ?? "Operation failed.");
    }

    public static async Task<ResponseModel<object>> HandleResponseWithAuditLogList(SqlDataReader reader)
    {
        var items = new List<AuditLogEntry>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapAuditLogEntryFromReader(reader));

        return new ResponseModel<object>(200, $"{items.Count} audit log entries found.", items);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithPagedAuditLogList(SqlDataReader reader,
        int pageNumber, int pageSize)
    {
        var items = new List<GlobalAuditLogEntry>();
        var totalItems = 0;

        while (await reader.ReadAsync().ConfigureAwait(false))
        {
            if (items.Count == 0)
                totalItems = Convert.ToInt32(reader["total_count"]);

            items.Add(MapGlobalAuditLogEntryFromReader(reader));
        }

        var pagedResponse = new PagedResponse<GlobalAuditLogEntry>(items, totalItems, pageNumber, pageSize);
        return new ResponseModel<object>(200, $"{items.Count} audit log entries found (page {pageNumber}).",
            pagedResponse);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithProductList(SqlDataReader reader)
    {
        var items = new List<ProductModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapProductFromReader(reader));

        return new ResponseModel<object>(200, $"{items.Count} products found.", items);
    }

    // usp_getProductDetails returns two result sets: the product (zero rows = not found), then
    // the customers who bought it.
    public static async Task<ResponseModel<object>> HandleResponseWithProductDetails(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<object>(404, "Product not found.");

        var details = new ProductDetailsModel { Product = MapProductFromReader(reader) };

        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            details.Buyers.Add(MapProductBuyerFromReader(reader));

        return new ResponseModel<object>(200, "Product found.", details);
    }

    public static async Task<ResponseModel<object>> HandleResponseWithPurchaseList(SqlDataReader reader)
    {
        var items = new List<PurchaseModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapPurchaseFromReader(reader));

        return new ResponseModel<object>(200, $"{items.Count} purchases found.", items);
    }

    // usp_purchaseProduct returns the usual (result, message) row plus product_name. On
    // success the name comes back as Data (the caller puts it in the audit entry); on any
    // failure it's the plain status + message that HandleResponseWithMessage would give.
    public static async Task<ResponseModel<object>> HandleResponseWithPurchaseResult(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<object>(500, "No data returned or operation failed.");

        var message = reader["message"] as string;
        return reader["result"] is 0
            ? new ResponseModel<object>(200, message ?? "Operation successful!", reader["product_name"] as string)
            : new ResponseModel<object>(Convert.ToInt32(reader["result"]), message ?? "Operation failed.");
    }

    public static async Task<MerchantAuthData?> HandleMerchantAuthDataResponse(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false)) return null;

        if (await reader.IsDBNullAsync(reader.GetOrdinal("password_hash")).ConfigureAwait(false) ||
            await reader.IsDBNullAsync(reader.GetOrdinal("password_salt")).ConfigureAwait(false))
            return null;

        return new MerchantAuthData(
            (byte[])reader["password_hash"],
            (byte[])reader["password_salt"],
            reader["merchant_role"] as int?
        );
    }

    // A real DB NULL must come back as a C# null, not "" — reader["col"].ToString() would
    // call DBNull.Value.ToString(), silently turning "never set" into "set to empty string".
    private static string? GetNullableString(SqlDataReader reader, string columnName) =>
        reader[columnName] as string;

    private static CustomerModel MapCustomerFromReader(SqlDataReader reader)
    {
        var customer = new CustomerModel
        {
            Guid = GetNullableString(reader, "PK_customer_guid"),
            FirstName = GetNullableString(reader, "first_name"),
            LastName = GetNullableString(reader, "last_name"),
            Email = GetNullableString(reader, "email"),
            Msisdn = GetNullableString(reader, "msisdn"),
            CreationDate = GetNullableString(reader, "creation_Date"),
            InteractionDate = GetNullableString(reader, "interaction_Date"),
            Birthdate = GetNullableString(reader, "birthDate"),
            Address = new AddressModel
            {
                Country = GetNullableString(reader, "country"),
                County = GetNullableString(reader, "county"),
                Town = GetNullableString(reader, "town"),
                Zip = GetNullableString(reader, "zip_code"),
                Street = GetNullableString(reader, "street"),
                Number = GetNullableString(reader, "number")
            },
            Gender = int.TryParse(reader["gender"].ToString(), out var gender) ? gender : null,
            CustomerStatus = int.TryParse(reader["customer_Status"].ToString(), out var status) ? status : null
        };

        return customer;
    }

    private static AuditLogEntry MapAuditLogEntryFromReader(SqlDataReader reader)
    {
        return new AuditLogEntry
        {
            AuditId = Convert.ToInt32(reader["audit_id"]),
            CustomerGuid = GetNullableString(reader, "customer_guid"),
            MerchantId = GetNullableString(reader, "merchant_id"),
            Action = GetNullableString(reader, "action"),
            Details = GetNullableString(reader, "details"),
            ActionDate = (DateTime)reader["action_Date"]
        };
    }

    private static GlobalAuditLogEntry MapGlobalAuditLogEntryFromReader(SqlDataReader reader)
    {
        return new GlobalAuditLogEntry
        {
            AuditId = Convert.ToInt32(reader["audit_id"]),
            CustomerGuid = GetNullableString(reader, "customer_guid"),
            // A DBNull here (deleted customer, via the proc's LEFT JOIN) must come back
            // as a real null — see GetNullableString above.
            CustomerFirstName = GetNullableString(reader, "first_name"),
            CustomerLastName = GetNullableString(reader, "last_name"),
            MerchantId = GetNullableString(reader, "merchant_id"),
            Action = GetNullableString(reader, "action"),
            Details = GetNullableString(reader, "details"),
            ActionDate = (DateTime)reader["action_Date"]
        };
    }

    private static ProductModel MapProductFromReader(SqlDataReader reader)
    {
        return new ProductModel
        {
            Guid = GetNullableString(reader, "PK_product_guid"),
            Name = GetNullableString(reader, "product_name"),
            Category = GetNullableString(reader, "category"),
            Comment = GetNullableString(reader, "comment"),
            Price = Convert.ToDecimal(reader["price"]),
            InventoryQuantity = Convert.ToInt32(reader["inventory_quantity"]),
            StockQuantity = Convert.ToInt32(reader["stock_quantity"]),
            SoldQuantity = Convert.ToInt32(reader["sold_quantity"]),
            Depot = GetNullableString(reader, "depot")
        };
    }

    private static ProductBuyerModel MapProductBuyerFromReader(SqlDataReader reader)
    {
        return new ProductBuyerModel
        {
            PurchaseId = Convert.ToInt32(reader["purchase_id"]),
            CustomerGuid = GetNullableString(reader, "FK_customer_guid"),
            CustomerFirstName = GetNullableString(reader, "first_name"),
            CustomerLastName = GetNullableString(reader, "last_name"),
            CustomerEmail = GetNullableString(reader, "email"),
            PurchaseDate = (DateTime)reader["purchase_date"]
        };
    }

    private static PurchaseModel MapPurchaseFromReader(SqlDataReader reader)
    {
        return new PurchaseModel
        {
            PurchaseId = Convert.ToInt32(reader["purchase_id"]),
            CustomerGuid = GetNullableString(reader, "FK_customer_guid"),
            ProductGuid = GetNullableString(reader, "FK_product_guid"),
            ProductName = GetNullableString(reader, "product_name"),
            Category = GetNullableString(reader, "category"),
            Price = Convert.ToDecimal(reader["price"]),
            PurchaseDate = (DateTime)reader["purchase_date"]
        };
    }

    private static void AddAddressParameters(SqlCommand command, AddressModel? address)
    {
        if (address == null) return;

        command.Parameters.AddWithValue("@var_Country", address.Country ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@var_County", address.County ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@var_Town", address.Town ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@var_ZIP", address.Zip ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@var_Street", address.Street ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("@var_Number", address.Number ?? (object)DBNull.Value);
    }
}