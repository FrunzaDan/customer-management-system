using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.Repositories;

public class MerchantRepository(StoredProcedureExecutor executor) : IMerchantRepository
{
    public Task<MerchantAuthData?> GetMerchantAuthDataAsync(string username,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Merchant_GetAuthData",
            command => command.Parameters.AddNVarChar("@Username", FieldLengthConstants.Username, username),
            HandleMerchantAuthDataResponseAsync,
            cancellationToken);

    public Task RecordMerchantLoginAsync(string username, CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Merchant_RecordLogin",
            command => command.Parameters.AddNVarChar("@Username", FieldLengthConstants.Username, username),
            _ => Task.FromResult(true),
            cancellationToken);

    private static async Task<MerchantAuthData?> HandleMerchantAuthDataResponseAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false)) return null;

        return new MerchantAuthData(
            reader.GetBytes("PasswordHash"),
            reader.GetBytes("PasswordSalt"),
            (MerchantRole)reader.GetInt16("RoleCode")
        );
    }
}
