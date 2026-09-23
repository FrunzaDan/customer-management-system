using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface ICustomerService
{
    Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<string>> GetCustomersForExport(ExportCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<CustomerModel>> GetCustomer(string? searchTerm, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerId, CancellationToken cancellationToken = default);

    Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default);

    Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productId, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> PurchaseProduct(Guid customerId, Guid productId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<Guid?>> RegisterCustomer(CreateCustomerRequest request, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> EditCustomer(UpdateCustomerRequest request, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeactivateCustomer(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> ReactivateCustomer(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteCustomer(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);

    Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default);
}
