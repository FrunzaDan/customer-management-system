using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;

namespace CustomerManagementSystem.Tests.DataAccess;

public class SqlConnectionFactoryTests
{
    private const string Docker = "Server=localhost,1433;Database=Test;User Id=sa;Password=x";
    private const string LocalSqlServer = "Server=localhost;Database=Test;Integrated Security=True";

    private static DatabaseOptions Options(string? localSqlServer = LocalSqlServer) =>
        new() { Docker = Docker, LocalSqlServer = localSqlServer };

    [Fact]
    public async Task UsesDocker_WithoutProbing_WhenNotOnWindows()
    {
        var probes = 0;
        var factory = new SqlConnectionFactory(Options(), new FakeLogger<SqlConnectionFactory>(), isWindows: false,
            _ => { probes++; return Task.FromResult(false); });

        Assert.Equal(Docker, await factory.GetConnectionStringAsync());
        Assert.Equal(0, probes);
    }

    [Fact]
    public async Task UsesDocker_OnWindows_WhenTheContainerAnswers()
    {
        var factory = new SqlConnectionFactory(Options(), new FakeLogger<SqlConnectionFactory>(), isWindows: true,
            connectionString => Task.FromResult(connectionString == Docker));

        Assert.Equal(Docker, await factory.GetConnectionStringAsync());
    }

    [Fact]
    public async Task FallsBackToTheLocalSqlServer_OnWindows_WhenTheContainerDoesNotAnswer()
    {
        var logger = new FakeLogger<SqlConnectionFactory>();
        var factory = new SqlConnectionFactory(Options(), logger, isWindows: true, _ => Task.FromResult(false));

        Assert.Equal(LocalSqlServer, await factory.GetConnectionStringAsync());
        Assert.Equal(LogLevel.Warning, logger.LatestRecord.Level);
        Assert.Equal(4, logger.LatestRecord.Id.Id);
    }

    [Fact]
    public async Task UsesDocker_WithoutProbing_OnWindows_WhenNoLocalSqlServerIsConfigured()
    {
        var probes = 0;
        var factory = new SqlConnectionFactory(Options(localSqlServer: null), new FakeLogger<SqlConnectionFactory>(),
            isWindows: true, _ => { probes++; return Task.FromResult(false); });

        Assert.Equal(Docker, await factory.GetConnectionStringAsync());
        Assert.Equal(0, probes);
    }

    [Fact]
    public async Task ProbesOnce_ForConcurrentFirstRequests()
    {
        var probes = 0;
        var answer = new TaskCompletionSource<bool>();
        var factory = new SqlConnectionFactory(Options(), new FakeLogger<SqlConnectionFactory>(), isWindows: true,
            _ => { Interlocked.Increment(ref probes); return answer.Task; });

        var first = factory.GetConnectionStringAsync();
        var second = factory.GetConnectionStringAsync();
        answer.SetResult(true);

        Assert.Equal(Docker, await first);
        Assert.Equal(Docker, await second);
        Assert.Equal(1, probes);
    }
}
