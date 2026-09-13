using System.Data;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public class DbUtils(IAppSettingsConfig configuration) : IDbUtils
{
    private string? CurrentConnectionString { get; set; }

    public async Task<ResponseModel<object>> RegisterCustomer(CustomerModel customer)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_createCustomer",
            command => DbHelper.AddCustomerParametersForCreate(command, customer),
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<object>> GetCustomer(GetCustomerRequest request)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getCustomer",
            command =>
            {
                command.Parameters.AddWithValue("@var_SearchOption", request.SearchOption);
                command.Parameters.AddWithValue("@var_SearchVariable", request.SearchVariable ?? (object)DBNull.Value);
            },
            reader => DbHelper.HandleResponseWithCustomerMapping(reader, "Customer found.",
                "Customer not found")
        );
    }

    public async Task<ResponseModel<object>> GetCustomers(GetCustomersRequest request)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getCustomers",
            command =>
            {
                command.Parameters.AddWithValue("@PageNumber", request.PageNumber);
                command.Parameters.AddWithValue("@PageSize", request.PageSize);
                command.Parameters.AddWithValue("@SearchTerm", (object?)request.SearchTerm ?? DBNull.Value);
                command.Parameters.AddWithValue("@SortColumn", request.SortColumn);
                command.Parameters.AddWithValue("@SortDirection", request.SortDirection);
            },
            reader => DbHelper.HandleResponseWithPagedList(reader, request.PageNumber, request.PageSize, "customers")
        );
    }

    public async Task<ResponseModel<object>> EditCustomer(CustomerModel customer)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_editCustomer",
            command => DbHelper.AddCustomerParametersForEdit(command, customer),
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<object>> DeactivateCustomer(string customerGuid)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_deactivateCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<object>> ReactivateCustomer(string customerGuid)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_reactivateCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<object>> DeleteCustomer(string customerGuid)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_deleteCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<int?>> CheckMerchantCredentialsFromDb(MerchantCredentials merchantCredentials)
    {
        var authData = await ExecuteStoredProcedureAsync(
            "dbo.usp_getMerchantAuthData",
            command => command.Parameters.AddWithValue("@var_MerchantID", merchantCredentials.MerchantId),
            DbHelper.HandleMerchantAuthDataResponse
        );

        if (authData is null ||
            !PasswordHasher.VerifyPassword(merchantCredentials.MerchantPassword ?? string.Empty, authData.PasswordHash,
                authData.PasswordSalt))
            return new ResponseModel<int?>(403, "Invalid Merchant ID or Password.");

        return authData.MerchantRole == 1801
            ? new ResponseModel<int?>(200, $"Credentials validated successfully. Role: {authData.MerchantRole}.",
                authData.MerchantRole)
            : new ResponseModel<int?>(403, $"The provided merchant role ({authData.MerchantRole}) is not valid.");
    }

    public async Task<ResponseModel<object>> LogCustomerAudit(string customerGuid, string merchantId, string action,
        string? details)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_insertCustomerAuditLog",
            command =>
            {
                command.Parameters.AddWithValue("@var_CustomerGuid", customerGuid);
                command.Parameters.AddWithValue("@var_MerchantID", merchantId);
                command.Parameters.AddWithValue("@var_Action", action);
                command.Parameters.AddWithValue("@var_Details", (object?)details ?? DBNull.Value);
            },
            DbHelper.HandleResponseWithMessage
        );
    }

    public async Task<ResponseModel<object>> GetCustomerAuditLog(string customerGuid)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getCustomerAuditLog",
            command => command.Parameters.AddWithValue("@var_CustomerGuid", customerGuid),
            DbHelper.HandleResponseWithAuditLogList
        );
    }

    public async Task<ResponseModel<object>> GetAllCustomerAuditLog(int pageNumber, int pageSize)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getAllCustomerAuditLog",
            command =>
            {
                command.Parameters.AddWithValue("@PageNumber", pageNumber);
                command.Parameters.AddWithValue("@PageSize", pageSize);
            },
            reader => DbHelper.HandleResponseWithPagedAuditLogList(reader, pageNumber, pageSize)
        );
    }

    private void CheckConnectionString()
    {
        if (!string.IsNullOrEmpty(CurrentConnectionString)) return;
        CurrentConnectionString = new CurrentSqlConnection(configuration).GetCorrectSqlConnectionString();
    }

    private async Task<T> ExecuteStoredProcedureAsync<T>(
        string storedProcedure,
        Action<SqlCommand>? configureCommand,
        Func<SqlDataReader, Task<T>> handleReader)
    {
        try
        {
            CheckConnectionString();

            await using var connection = new SqlConnection(CurrentConnectionString);
            await connection.OpenAsync().ConfigureAwait(false);

            await using var command = new SqlCommand(storedProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;

            configureCommand?.Invoke(command);

            await using var reader = await command.ExecuteReaderAsync().ConfigureAwait(false);
            return await handleReader(reader);
        }
        catch (SqlException sqlEx)
        {
            throw new InvalidOperationException(
                $"Error executing stored procedure '{storedProcedure}': {sqlEx.Message}", sqlEx);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Unexpected error during stored procedure execution: {ex.Message}",
                ex);
        }
    }
}