using System.Data;
using CustomerManagementSystem.Domain.Configuration;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public class CurrentSqlConnection(IAppSettingsConfig configuration)
{
    private readonly IAppSettingsConfig _configuration =
        configuration ?? throw new ArgumentNullException(nameof(configuration));

    public async Task<string?> GetCorrectSqlConnectionStringAsync(CancellationToken cancellationToken = default)
    {
        return await GetValidConnectionStringAsync(cancellationToken,
            _configuration.CustomerManagementSystemDbDocker,
            _configuration.CustomerManagementSystemDbWindows);
    }

    private static async Task<string?> GetValidConnectionStringAsync(CancellationToken cancellationToken,
        params string?[] connectionStrings)
    {
        foreach (var connectionString in connectionStrings)
        {
            if (await IsConnectionValidAsync(connectionString, cancellationToken).ConfigureAwait(false))
                return connectionString;
        }

        return null;
    }

    private static async Task<bool> IsConnectionValidAsync(string? connectionString,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return false;

        try
        {
            await using var sqlConnection = new SqlConnection(connectionString);
            await sqlConnection.OpenAsync(cancellationToken).ConfigureAwait(false);
            return sqlConnection.State == ConnectionState.Open;
        }
        catch (SqlException)
        {
            return false;
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return false;
        }
    }
}