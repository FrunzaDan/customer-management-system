using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Auth;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using CustomerManagementSystem.BusinessLogic.Features.Purchases;
using Microsoft.Extensions.DependencyInjection;

namespace CustomerManagementSystem.BusinessLogic;

public static class BusinessLogicDependencyInjection
{
    public static void AddBusinessLogic(this IServiceCollection services)
    {
        services.AddSingleton<JwtCreation>();
        services.AddScoped<GetAccessTokenHandler>();

        services.AddScoped<CreateCustomerHandler>();
        services.AddScoped<GetCustomerHandler>();
        services.AddScoped<GetCustomersHandler>();
        services.AddScoped<ExportCustomersHandler>();
        services.AddScoped<UpdateCustomerHandler>();
        services.AddScoped<DeactivateCustomerHandler>();
        services.AddScoped<ReactivateCustomerHandler>();
        services.AddScoped<DeleteCustomerHandler>();
        services.AddScoped<GetCustomerInsightsHandler>();

        services.AddScoped<PurchaseProductHandler>();
        services.AddScoped<GetCustomerPurchasesHandler>();

        services.AddScoped<ICustomerAuditLogger, CustomerAuditLogger>();
        services.AddScoped<GetCustomerAuditLogHandler>();
        services.AddScoped<GetAllCustomerAuditLogHandler>();
        services.AddScoped<DeleteAllCustomerAuditLogHandler>();

        services.AddScoped<CreateProductHandler>();
        services.AddScoped<GetProductsHandler>();
        services.AddScoped<GetProductDetailsHandler>();
        services.AddScoped<ResetProductStockHandler>();
    }
}
