using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class CustomerService(
    CustomerCreation customerCreation,
    CustomerGetting customerGetting,
    CustomerUpdating customerUpdating,
    CustomerActivation customerActivation,
    CustomerDeletion customerDeletion,
    CustomerPurchasing customerPurchasing,
    ProductCreation productCreation)
    : ICustomerService
{
    public Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest request,
        CancellationToken cancellationToken = default) =>
        productCreation.CreateProductFunction(request, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default) =>
        customerGetting.GetProductsFunction(cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productId,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetProductDetailsFunction(productId, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerId,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerPurchasesFunction(customerId, cancellationToken);

    public Task<ResponseModel<object>> PurchaseProduct(Guid customerId, Guid productId,
        string performedBy, CancellationToken cancellationToken = default) =>
        customerPurchasing.PurchaseProduct(customerId, productId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomer(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerActivation.DeactivateCustomer(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomer(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerActivation.ReactivateCustomer(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomer(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerDeletion.DeleteCustomer(customerId, performedBy, cancellationToken);

    public Task<ResponseModel<object>> UpdateCustomer(UpdateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerUpdating.UpdateCustomerFunction(request, performedBy, cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomer(string? searchTerm,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerFunction(searchTerm, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerId,
        CancellationToken cancellationToken = default) =>
        customerGetting.GetCustomerAuditLogFunction(customerId, cancellationToken);

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

    public Task<ResponseModel<Guid?>> CreateCustomer(CreateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default) =>
        customerCreation.CreateCustomerFunction(request, performedBy, cancellationToken);

    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default) =>
        customerGetting.GetMonthlyActivityFunction(cancellationToken);
}
