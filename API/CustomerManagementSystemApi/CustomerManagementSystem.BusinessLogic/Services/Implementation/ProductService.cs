using CustomerManagementSystem.BusinessLogic.CatalogFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services.Implementation;

public class ProductService(ProductFunctions productFunctions) : IProductService
{
    public Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest request,
        CancellationToken cancellationToken = default) =>
        productFunctions.CreateProductAsync(request, cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId,
        CancellationToken cancellationToken = default) =>
        productFunctions.GetProductDetailsAsync(productId, cancellationToken);

    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(
        CancellationToken cancellationToken = default) =>
        productFunctions.GetProductsAsync(cancellationToken);
}
