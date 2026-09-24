using CustomerManagementSystem.Domain.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface ISqlConnectionFactory
{
    Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}

public sealed partial class SqlConnectionFactory : ISqlConnectionFactory
{
    private const int ProbeTimeoutSeconds = 3;

    private readonly Lazy<Task<string>> _connectionString;

    public SqlConnectionFactory(IOptions<DatabaseOptions> options, ILogger<SqlConnectionFactory> logger)
        : this(options.Value, logger, OperatingSystem.IsWindows(), CanConnectAsync)
    {
    }

    internal SqlConnectionFactory(DatabaseOptions options, ILogger<SqlConnectionFactory> logger, bool isWindows,
        Func<string, Task<bool>> canConnect)
    {
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

    private static async Task<bool> CanConnectAsync(string connectionString)
    {
        var probe = new SqlConnectionStringBuilder(connectionString)
        {
            ConnectTimeout = ProbeTimeoutSeconds,
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
