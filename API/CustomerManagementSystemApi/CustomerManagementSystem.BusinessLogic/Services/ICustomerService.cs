using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface ICustomerService
{
    Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<string>> GetCustomersForExport(ExportCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<CustomerModel>> GetCustomer(string? searchVariable, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default);

    Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerGuid, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> PurchaseProduct(Guid customerGuid, Guid productGuid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<Guid?>> RegisterCustomer(CreateCustomerRequest request, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> EditCustomer(UpdateCustomerRequest request, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeactivateCustomer(Guid guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> ReactivateCustomer(Guid guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteCustomer(Guid guid, string merchantId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);

    Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default);
}
