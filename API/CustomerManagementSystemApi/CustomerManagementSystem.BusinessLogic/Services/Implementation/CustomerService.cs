using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class CustomerService(
    CustomerRegistration customerRegistration,
    CustomerGetting customerGetting,
    CustomerEditing customerEditing,
    CustomerActivation customerActivation,
    CustomerDeletion customerDeletion,
    CustomerPurchasing customerPurchasing)
    : ICustomerService
{
    public async Task<ResponseModel<object>> GetProducts(CancellationToken cancellationToken = default) =>
        await customerGetting.GetProductsFunction(cancellationToken);

    public async Task<ResponseModel<object>> GetProductDetails(string productGuid,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetProductDetailsFunction(productGuid, cancellationToken);

    public async Task<ResponseModel<object>> GetCustomerPurchases(string customerGuid,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetCustomerPurchasesFunction(customerGuid, cancellationToken);

    public async Task<ResponseModel<object>> PurchaseProduct(string customerGuid, string productGuid,
        string merchantId, CancellationToken cancellationToken = default) =>
        await customerPurchasing.PurchaseProduct(customerGuid, productGuid, merchantId, cancellationToken);

    public async Task<ResponseModel<object>> DeactivateCustomer(string customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        await customerActivation.DeactivateCustomer(customerGuid, merchantId, cancellationToken);

    public async Task<ResponseModel<object>> ReactivateCustomer(string customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        await customerActivation.ReactivateCustomer(customerGuid, merchantId, cancellationToken);

    public async Task<ResponseModel<object>> DeleteCustomer(string customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        await customerDeletion.DeleteCustomer(customerGuid, merchantId, cancellationToken);

    public async Task<ResponseModel<object>> EditCustomer(CustomerModel editCustomerRequest, string merchantId,
        CancellationToken cancellationToken = default) =>
        await customerEditing.EditCustomerFunction(editCustomerRequest, merchantId, cancellationToken);

    public async Task<ResponseModel<object>> GetCustomer(GetCustomerRequest getCustomerRqst,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetCustomerFunction(getCustomerRqst, cancellationToken);

    public async Task<ResponseModel<object>> GetCustomerAuditLog(string customerGuid,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetCustomerAuditLogFunction(customerGuid, cancellationToken);

    public async Task<ResponseModel<object>> GetAllCustomerAuditLog(int pageNumber, int pageSize,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetAllAuditLogFunction(pageNumber, pageSize, cancellationToken);

    public async Task<ResponseModel<object>> DeleteAllCustomerAuditLog(
        CancellationToken cancellationToken = default) =>
        await customerDeletion.DeleteAllAuditLogFunction(cancellationToken);

    public async Task<ResponseModel<object>> GetCustomers(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetCustomersFunction(request, cancellationToken);

    public async Task<ResponseModel<object>> GetCustomersForExport(ExportCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        await customerGetting.GetCustomersForExportFunction(request, cancellationToken);

    public async Task<ResponseModel<object>> RegisterCustomer(CustomerModel customerRqst, string merchantId,
        CancellationToken cancellationToken = default) =>
        await customerRegistration.RegisterCustomerFunction(customerRqst, merchantId, cancellationToken);
}
