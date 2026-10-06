using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;

namespace CustomerManagementSystem.BusinessLogic.Features.Products;

// Demo helper: every product back to its initial stock.
public class ResetProductStockHandler(IProductRepository products)
{
    public Task<ResponseModel<object>> HandleAsync(CancellationToken cancellationToken = default) =>
        products.ResetProductStockAsync(cancellationToken);
}
