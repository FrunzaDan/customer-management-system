using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface IDbUtils
{
    public Task<ResponseModel<Guid?>> RegisterCustomer(CreateCustomerRequest customer, CancellationToken cancellationToken = default);
    public Task<ResponseModel<CustomerModel>> GetCustomer(CustomerLookup lookup, CancellationToken cancellationToken = default);
    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> EditCustomer(UpdateCustomerRequest customer, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeactivateCustomer(Guid customerId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> ReactivateCustomer(Guid customerId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteCustomer(Guid customerId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<MerchantRole?>> CheckMerchantCredentialsFromDb(MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> LogCustomerAudit(Guid customerId, string performedBy, AuditAction action, string? details, CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default);
    public Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<string>> PurchaseProduct(Guid customerId, Guid productId, CancellationToken cancellationToken = default);
    public Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest product, CancellationToken cancellationToken = default);
    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default);
}
