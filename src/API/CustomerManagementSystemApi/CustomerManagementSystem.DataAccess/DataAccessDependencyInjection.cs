using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.DataAccess.DBConnection;
using Microsoft.Extensions.DependencyInjection;

namespace CustomerManagementSystem.DataAccess;

public static class DataAccessDependencyInjection
{
    /// <summary>Registers the SQL Server implementations of the abstractions BusinessLogic declares.</summary>
    public static void AddDataAccess(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<IDbUtils, DbUtils>();
    }
}
