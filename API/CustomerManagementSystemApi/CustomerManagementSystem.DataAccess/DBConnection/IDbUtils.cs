using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public interface IDbUtils
{
    public Task<ResponseModel<object>> RegisterCustomer(CustomerModel customer, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetCustomer(GetCustomerRequest getCustomerRqst, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetCustomers(GetCustomersRequest request, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> EditCustomer(CustomerModel editCustomerRqst, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeactivateCustomer(string customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> ReactivateCustomer(string customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteCustomer(string customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<int?>> CheckMerchantCredentialsFromDb(MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> LogCustomerAudit(string customerGuid, string merchantId, string action, string? details, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetCustomerAuditLog(string customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetAllCustomerAuditLog(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetProducts(CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetProductDetails(string productGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> GetCustomerPurchases(string customerGuid, CancellationToken cancellationToken = default);
    public Task<ResponseModel<object>> PurchaseProduct(string customerGuid, string productGuid, CancellationToken cancellationToken = default);
}