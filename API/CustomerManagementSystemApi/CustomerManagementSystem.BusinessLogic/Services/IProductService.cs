using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Services;

public interface IProductService
{
    Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default);

    Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId, CancellationToken cancellationToken = default);

    Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(CancellationToken cancellationToken = default);
}
