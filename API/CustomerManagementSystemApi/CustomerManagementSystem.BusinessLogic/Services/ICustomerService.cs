using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface ICustomerService
{
    Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<string>> GetCustomersForExportAsync(ExportCustomersRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<CustomerModel>> GetCustomerAsync(string? searchTerm, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId, CancellationToken cancellationToken = default);

    Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> PurchaseProductAsync(Guid customerId, Guid productId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest request, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest request, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId, string performedBy, CancellationToken cancellationToken = default);

    Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default);

    Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityAsync(CancellationToken cancellationToken = default);
}
