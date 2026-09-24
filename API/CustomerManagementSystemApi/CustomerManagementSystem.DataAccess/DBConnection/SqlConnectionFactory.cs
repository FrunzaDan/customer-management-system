using CustomerManagementSystem.Domain.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface ISqlConnectionFactory
{
    Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}

// Chooses the database once per process, on first use, by operating system:
// - macOS/Linux: the Azure SQL Edge Docker container (ConnectionStrings:Docker) — SQL Server
//   itself doesn't run there.
// - Windows: the Docker container if it answers, otherwise the SQL Server installed on the machine
//   (ConnectionStrings:LocalSqlServer). The choice holds until restart, so start Docker first.
// A new SqlConnection per call is cheap: SqlClient pools the physical connections.
public sealed partial class SqlConnectionFactory : ISqlConnectionFactory
{
    // How long the Windows check waits for the Docker container before falling back.
    private const int ProbeTimeoutSeconds = 3;

    private readonly Lazy<Task<string>> _connectionString;

    public SqlConnectionFactory(IOptions<DatabaseOptions> options, ILogger<SqlConnectionFactory> logger)
        : this(options.Value, logger, OperatingSystem.IsWindows(), CanConnectAsync)
    {
    }

    internal SqlConnectionFactory(DatabaseOptions options, ILogger<SqlConnectionFactory> logger, bool isWindows,
        Func<string, Task<bool>> canConnect)
    {
        // Lazy<Task>: concurrent first requests share one check instead of each probing Docker.
        _connectionString = new Lazy<Task<string>>(() => ChooseAsync(options, logger, isWindows, canConnect));
    }

    public async Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new SqlConnection(await GetConnectionStringAsync().WaitAsync(cancellationToken));
        try
        {
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
        catch
        {
            await connection.DisposeAsync();
            throw;
        }
    }

    internal Task<string> GetConnectionStringAsync() => _connectionString.Value;

    private static async Task<string> ChooseAsync(DatabaseOptions options, ILogger logger, bool isWindows,
        Func<string, Task<bool>> canConnect)
    {
        if (isWindows && !string.IsNullOrWhiteSpace(options.LocalSqlServer) && !await canConnect(options.Docker))
        {
            LogUsingLocalSqlServer(logger);
            return options.LocalSqlServer;
        }

        LogUsingDocker(logger);
        return options.Docker;
    }

    // Not cancelled by the request that triggered it: the result is shared by every later request,
    // and the short connect timeout already bounds it.
    private static async Task<bool> CanConnectAsync(string connectionString)
    {
        var probe = new SqlConnectionStringBuilder(connectionString)
        {
            ConnectTimeout = ProbeTimeoutSeconds,
            // A failed probe shouldn't leave a pool behind.
            Pooling = false
        };

        try
        {
            await using var connection = new SqlConnection(probe.ConnectionString);
            await connection.OpenAsync();
            return true;
        }
        catch (SqlException)
        {
            return false;
        }
    }

    [LoggerMessage(EventId = 3, Level = LogLevel.Information,
        Message = "Using the Docker SQL Server (ConnectionStrings:Docker).")]
    private static partial void LogUsingDocker(ILogger logger);

    [LoggerMessage(EventId = 4, Level = LogLevel.Warning,
        Message = "The Docker SQL Server did not answer; using the local SQL Server (ConnectionStrings:LocalSqlServer).")]
    private static partial void LogUsingLocalSqlServer(ILogger logger);
}
