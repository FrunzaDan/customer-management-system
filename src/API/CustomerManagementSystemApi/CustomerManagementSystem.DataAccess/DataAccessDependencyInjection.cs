using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.DataAccess.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace CustomerManagementSystem.DataAccess;

public static class DataAccessDependencyInjection
{
    /// <summary>Registers the SQL Server implementations of the abstractions BusinessLogic declares.</summary>
    public static void AddDataAccess(this IServiceCollection services)
    {
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<StoredProcedureExecutor>();
        services.AddSingleton<ICustomerRepository, CustomerRepository>();
        services.AddSingleton<IPurchaseRepository, PurchaseRepository>();
        services.AddSingleton<IProductRepository, ProductRepository>();
        services.AddSingleton<IAuditLogRepository, AuditLogRepository>();
        services.AddSingleton<IMerchantRepository, MerchantRepository>();
    }
}
