using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface IDbUtils
{
    public Task<ResponseModel<Guid?>> RegisterCustomer(CreateCustomerRequest customer, CancellationToken cancellationToken = default);
    public Task<ResponseModel<CustomerModel>> GetCustomer(CustomerLookup lookup, CancellationToken cancellationToken = default);
    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> EditCustomer(UpdateCustomerRequest customer, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeactivateCustomer(Guid customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> ReactivateCustomer(Guid customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteCustomer(Guid customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<MerchantRole?>> CheckMerchantCredentialsFromDb(MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> LogCustomerAudit(Guid customerGuid, string merchantId, AuditAction action, string? details, CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default);
    public Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<string>> PurchaseProduct(Guid customerGuid, Guid productGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest product, CancellationToken cancellationToken = default);
    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default);
}
