using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.BusinessLogic.Services;
using CustomerManagementSystem.BusinessLogic.Services.Implementation;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CustomerManagementSystem.BusinessLogic;

public static class BusinessLogicDependencyInjection
{
    public static void AddBusinessLogic(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddSingleton<IDbUtils, DbUtils>();
        services.AddSingleton<IAppSettingsConfig, AppSettingsConfig>();
        services.AddSingleton<JwtCreation>();

        services.AddScoped<ICustomerAuditLogger, CustomerAuditLogger>();
        services.AddScoped<CustomerRegistration>();
        services.AddScoped<CustomerGetting>();
        services.AddScoped<CustomerEditing>();
        services.AddScoped<CustomerActivation>();
        services.AddScoped<CustomerDeletion>();
        services.AddScoped<CustomerPurchasing>();
    }
}