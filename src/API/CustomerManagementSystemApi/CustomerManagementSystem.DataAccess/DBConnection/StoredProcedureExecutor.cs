using System.Data;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

/// <summary>Runs one stored procedure on its own connection: the repositories supply the parameters and read the result.</summary>
public class StoredProcedureExecutor(ISqlConnectionFactory connectionFactory)
{
    public async Task<T> ExecuteAsync<T>(
        string storedProcedure,
        Action<SqlCommand>? configureCommand,
        Func<SqlDataReader, Task<T>> handleReader,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);

        await using var command = new SqlCommand(storedProcedure, connection);
        command.CommandType = CommandType.StoredProcedure;

        configureCommand?.Invoke(command);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
        return await handleReader(reader);
    }
}
