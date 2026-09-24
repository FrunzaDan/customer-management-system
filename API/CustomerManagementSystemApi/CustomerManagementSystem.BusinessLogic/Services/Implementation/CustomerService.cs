using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class CustomerService(
    CustomerCreation customerCreation,
    CustomerGetting customerGetting,
    CustomerUpdating customerUpdating,
    CustomerActivation customerActivation,
    CustomerDeletion customerDeletion,
    CustomerPurchasing customerPurchasing)
    : ICustomerService
{
    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerPurchasesAsync(customerId, cancellationToken);

    public Task<ResponseModel<object>> PurchaseProductAsync(Guid customerId, Guid productId,
        string performedBy, CancellationToken cancellationToken = default) =>
        customerPurchasing.PurchaseProductAsync(customerId, productId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerActivation.DeactivateCustomerAsync(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerActivation.ReactivateCustomerAsync(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerDeletion.DeleteCustomerAsync(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerUpdating.UpdateCustomerAsync(request, performedBy, cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomerAsync(string? searchTerm,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerAsync(searchTerm, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerAuditLogAsync(customerId, cancellationToken);

    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default) =>
        customerGetting.GetAllCustomerAuditLogAsync(pageNumber, pageSize, cancellationToken);

    public Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default) =>
        customerDeletion.DeleteAllCustomerAuditLogAsync(cancellationToken);

    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomersAsync(request, cancellationToken);

    public Task<ResponseModel<string>> GetCustomersForExportAsync(ExportCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomersForExportAsync(request, cancellationToken);

    public Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerCreation.CreateCustomerAsync(request, performedBy, cancellationToken);

    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityAsync(CancellationToken cancellationToken = default) =>
        customerGetting.GetMonthlyActivityAsync(cancellationToken);
}
