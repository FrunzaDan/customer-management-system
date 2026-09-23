using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class CustomerService(
    CustomerRegistration customerRegistration,
    CustomerGetting customerGetting,
    CustomerEditing customerEditing,
    CustomerActivation customerActivation,
    CustomerDeletion customerDeletion,
    CustomerPurchasing customerPurchasing,
    ProductRegistration productRegistration)
    : ICustomerService
{
    public Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest request,
        CancellationToken cancellationToken = default) =>
        productRegistration.RegisterProductFunction(request, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default) =>
        customerGetting.GetProductsFunction(cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productGuid,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetProductDetailsFunction(productGuid, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerGuid,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerPurchasesFunction(customerGuid, cancellationToken);

    public Task<ResponseModel<object>> PurchaseProduct(Guid customerGuid, Guid productGuid,
        string merchantId, CancellationToken cancellationToken = default) =>
        customerPurchasing.PurchaseProduct(customerGuid, productGuid, merchantId, cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomer(Guid customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        customerActivation.DeactivateCustomer(customerGuid, merchantId, cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomer(Guid customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        customerActivation.ReactivateCustomer(customerGuid, merchantId, cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomer(Guid customerGuid, string merchantId,
        CancellationToken cancellationToken = default) =>
        customerDeletion.DeleteCustomer(customerGuid, merchantId, cancellationToken);

    public Task<ResponseModel<object>> EditCustomer(UpdateCustomerRequest request, string merchantId,
        CancellationToken cancellationToken = default) =>
        customerEditing.EditCustomerFunction(request, merchantId, cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomer(string? searchVariable,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerFunction(searchVariable, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerGuid,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerAuditLogFunction(customerGuid, cancellationToken);

    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default) =>
        customerGetting.GetAllAuditLogFunction(pageNumber, pageSize, cancellationToken);

    public Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default) =>
        customerDeletion.DeleteAllAuditLogFunction(cancellationToken);

    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomersFunction(request, cancellationToken);

    public Task<ResponseModel<string>> GetCustomersForExport(ExportCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomersForExportFunction(request, cancellationToken);

    public Task<ResponseModel<Guid?>> RegisterCustomer(CreateCustomerRequest request, string merchantId,
        CancellationToken cancellationToken = default) =>
        customerRegistration.RegisterCustomerFunction(request, merchantId, cancellationToken);

    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default) =>
        customerGetting.GetMonthlyActivityFunction(cancellationToken);
}
