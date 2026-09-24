using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.BusinessLogic.Services.Implementation;
using CustomerManagementSystem.DataAccess.DBConnection;
using Microsoft.Extensions.DependencyInjection;

namespace CustomerManagementSystem.BusinessLogic;

public static class BusinessLogicDependencyInjection
{
    public static void AddBusinessLogic(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<IDbUtils, DbUtils>();
        services.AddSingleton<JwtCreation>();

        services.AddScoped<ICustomerAuditLogger, CustomerAuditLogger>();
        services.AddScoped<CustomerCreation>();
        services.AddScoped<CustomerGetting>();
        services.AddScoped<CustomerUpdating>();
        services.AddScoped<CustomerActivation>();
        services.AddScoped<CustomerDeletion>();
        services.AddScoped<CustomerPurchasing>();
        services.AddScoped<ProductCreation>();
    }
}