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
        command.Parameters.AddWithValue("@var_Gender", customer.Gender);
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

    private static CustomerModel MapCustomerFromReader(SqlDataReader reader)
    {
        var customer = new CustomerModel
        {
            Guid = reader["PK_customer_guid"].ToString(),
            FirstName = reader["first_name"].ToString(),
            LastName = reader["last_name"].ToString(),
            Email = reader["email"].ToString(),
            Msisdn = reader["msisdn"].ToString(),
            CreationDate = reader["creation_Date"].ToString(),
            InteractionDate = reader["interaction_Date"].ToString(),
            Birthdate = reader["birthDate"].ToString(),
            Address = new AddressModel
            {
                Country = reader["country"].ToString(),
                County = reader["county"].ToString(),
                Town = reader["town"].ToString(),
                Zip = reader["zip_code"].ToString(),
                Street = reader["street"].ToString(),
                Number = reader["number"].ToString()
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
            CustomerGuid = reader["customer_guid"].ToString(),
            MerchantId = reader["merchant_id"].ToString(),
            Action = reader["action"].ToString(),
            Details = reader["details"].ToString(),
            ActionDate = (DateTime)reader["action_Date"]
        };
    }

    private static GlobalAuditLogEntry MapGlobalAuditLogEntryFromReader(SqlDataReader reader)
    {
        return new GlobalAuditLogEntry
        {
            AuditId = Convert.ToInt32(reader["audit_id"]),
            CustomerGuid = reader["customer_guid"].ToString(),
            // `as string`, not `.ToString()`: a DBNull (deleted customer, via the
            // proc's LEFT JOIN) must come back as a real null, not the empty
            // string DBNull.Value.ToString() would produce.
            CustomerFirstName = reader["first_name"] as string,
            CustomerLastName = reader["last_name"] as string,
            MerchantId = reader["merchant_id"].ToString(),
            Action = reader["action"].ToString(),
            Details = reader["details"].ToString(),
            ActionDate = (DateTime)reader["action_Date"]
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