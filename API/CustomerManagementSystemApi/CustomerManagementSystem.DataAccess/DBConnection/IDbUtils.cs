using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface IDbUtils
{
    Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest customer, CancellationToken cancellationToken = default);
    Task<ResponseModel<CustomerModel>> GetCustomerAsync(CustomerLookup lookup, CancellationToken cancellationToken = default);
    Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest customer, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<MerchantRole?>> CheckMerchantCredentialsFromDbAsync(MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> LogCustomerAuditAsync(Guid customerId, string performedBy, AuditAction action, string? details, CancellationToken cancellationToken = default);
    Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default);
    Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(CancellationToken cancellationToken = default);
    Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<string>> PurchaseProductAsync(Guid customerId, Guid productId, CancellationToken cancellationToken = default);
    Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest product, CancellationToken cancellationToken = default);
    Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityAsync(CancellationToken cancellationToken = default);
}
