using System.Data;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public class DbUtils(IAppSettingsConfig configuration) : IDbUtils
{
    // DbUtils is registered as a singleton, so this cache is shared across every concurrent
    // request for the app's lifetime — the lock stops concurrent cold-start (or sustained
    // DB-unavailability) requests from redundantly re-running connection-string resolution.
    private readonly SemaphoreSlim _connectionStringLock = new(1, 1);
    private string? CurrentConnectionString { get; set; }

    public async Task<ResponseModel<object>> RegisterCustomer(CustomerModel customer,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_createCustomer",
            command => DbHelper.AddCustomerParametersForCreate(command, customer),
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> GetCustomer(GetCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getCustomer",
            command =>
            {
                command.Parameters.Add("@var_SearchOption", SqlDbType.Int).Value = request.SearchOption;
                command.Parameters.AddWithValue("@var_SearchVariable", request.SearchVariable ?? (object)DBNull.Value);
            },
            reader => DbHelper.HandleResponseWithCustomerMapping(reader, "Customer found.",
                "Customer not found"),
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> GetCustomers(GetCustomersRequest request,
        CancellationToken cancellationToken = default)
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
            reader => DbHelper.HandleResponseWithPagedList(reader, request.PageNumber, request.PageSize, "customers"),
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> EditCustomer(CustomerModel customer,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_editCustomer",
            command => DbHelper.AddCustomerParametersForEdit(command, customer),
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> DeactivateCustomer(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_deactivateCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> ReactivateCustomer(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_reactivateCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> DeleteCustomer(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_deleteCustomer",
            command => command.Parameters.AddWithValue("@var_Guid", customerGuid),
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<int?>> CheckMerchantCredentialsFromDb(MerchantCredentials merchantCredentials,
        CancellationToken cancellationToken = default)
    {
        var authData = await ExecuteStoredProcedureAsync(
            "dbo.usp_getMerchantAuthData",
            command => command.Parameters.AddWithValue("@var_MerchantID", merchantCredentials.MerchantId),
            DbHelper.HandleMerchantAuthDataResponse,
            cancellationToken
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
        string? details, CancellationToken cancellationToken = default)
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
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> GetCustomerAuditLog(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getCustomerAuditLog",
            command => command.Parameters.AddWithValue("@var_CustomerGuid", customerGuid),
            DbHelper.HandleResponseWithAuditLogList,
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> GetAllCustomerAuditLog(int pageNumber, int pageSize,
        CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_getAllCustomerAuditLog",
            command =>
            {
                command.Parameters.AddWithValue("@PageNumber", pageNumber);
                command.Parameters.AddWithValue("@PageSize", pageSize);
            },
            reader => DbHelper.HandleResponseWithPagedAuditLogList(reader, pageNumber, pageSize),
            cancellationToken
        );
    }

    public async Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default)
    {
        return await ExecuteStoredProcedureAsync(
            "dbo.usp_deleteAllCustomerAuditLog",
            null,
            DbHelper.HandleResponseWithMessage,
            cancellationToken
        );
    }

    private async Task CheckConnectionStringAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(CurrentConnectionString)) return;

        await _connectionStringLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (!string.IsNullOrEmpty(CurrentConnectionString)) return; // re-check after acquiring the lock

            CurrentConnectionString = await new CurrentSqlConnection(configuration)
                .GetCorrectSqlConnectionStringAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _connectionStringLock.Release();
        }
    }

    private async Task<T> ExecuteStoredProcedureAsync<T>(
        string storedProcedure,
        Action<SqlCommand>? configureCommand,
        Func<SqlDataReader, Task<T>> handleReader,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await CheckConnectionStringAsync(cancellationToken).ConfigureAwait(false);

            await using var connection = new SqlConnection(CurrentConnectionString);
            await connection.OpenAsync(cancellationToken).ConfigureAwait(false);

            await using var command = new SqlCommand(storedProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;

            configureCommand?.Invoke(command);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            return await handleReader(reader);
        }
        catch (OperationCanceledException)
        {
            throw;
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
