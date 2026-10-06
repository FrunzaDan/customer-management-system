using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Products;

public class GetProductDetailsHandler(IProductRepository products)
{
    public async Task<ResponseModel<ProductDetailsModel>> HandleAsync(Guid productId,
        CancellationToken cancellationToken = default)
    {
        if (productId == Guid.Empty)
            return new ResponseModel<ProductDetailsModel>(400, "A valid product ID is required.");

        return await products.GetProductDetailsAsync(productId, cancellationToken);
    }
}
