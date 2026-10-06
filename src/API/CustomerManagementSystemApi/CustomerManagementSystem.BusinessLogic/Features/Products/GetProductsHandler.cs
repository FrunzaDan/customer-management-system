using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Products;

public class GetProductsHandler(IProductRepository products)
{
    public Task<ResponseModel<IReadOnlyList<ProductModel>>> HandleAsync(CancellationToken cancellationToken = default) =>
        products.GetProductsAsync(cancellationToken);
}
