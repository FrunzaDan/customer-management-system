using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Abstractions;

/// <summary>Product catalogue persistence. Implemented by DataAccess (stored procedures).</summary>
public interface IProductRepository
{
    Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(CancellationToken cancellationToken = default);
    Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest product, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> ResetProductStockAsync(CancellationToken cancellationToken = default);
}
