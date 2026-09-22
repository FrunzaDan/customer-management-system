using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface ICustomerService
{
    Task<ResponseModel<object>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetCustomersForExport(ExportCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetCustomer(GetCustomerRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetCustomerAuditLog(string customerGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetProducts(CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetProductDetails(string productGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> GetCustomerPurchases(string customerGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> PurchaseProduct(string customerGuid, string productGuid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> CreateProduct(ProductModel request, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> RegisterCustomer(CustomerModel request, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> EditCustomer(CustomerModel request, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeactivateCustomer(string guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> ReactivateCustomer(string guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteCustomer(string guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);
}