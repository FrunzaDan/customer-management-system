using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CatalogFunctions;

public class ProductFunctions(IDbUtils dbUtils)
{
    private const decimal MaxPrice = 9_999_999_999.99m;

    public async Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return new ResponseModel<Guid?>(400, "Product name is required.");
        if (request.Name.Length > FieldLengthConstants.ProductName)
            return new ResponseModel<Guid?>(400, "Product name is too long.");

        if (string.IsNullOrWhiteSpace(request.Category))
            return new ResponseModel<Guid?>(400, "Category is required.");
        if (request.Category.Length > FieldLengthConstants.ProductCategory)
            return new ResponseModel<Guid?>(400, "Category is too long.");

        if (request.Description is not null && request.Description.Length > FieldLengthConstants.ProductDescription)
            return new ResponseModel<Guid?>(400, "Description is too long.");

        if (request.Price <= 0)
            return new ResponseModel<Guid?>(400, "Price must be greater than zero.");

        if (decimal.Round(request.Price, 2) != request.Price || request.Price > MaxPrice)
            return new ResponseModel<Guid?>(400, $"Price must have at most two decimals and not exceed {MaxPrice:N2}.");

        if (request.InitialQuantity <= 0)
            return new ResponseModel<Guid?>(400, "Inventory quantity must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Warehouse))
            return new ResponseModel<Guid?>(400, "Warehouse is required.");
        if (request.Warehouse.Length > FieldLengthConstants.ProductWarehouse)
            return new ResponseModel<Guid?>(400, "Warehouse is too long.");

        return await dbUtils.CreateProductAsync(request, cancellationToken);
    }

    public async Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(
        CancellationToken cancellationToken = default) =>
        await dbUtils.GetProductsAsync(cancellationToken);

    public async Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId,
        CancellationToken cancellationToken = default)
    {
        if (productId == Guid.Empty)
            return new ResponseModel<ProductDetailsModel>(400, "A valid product ID is required.");

        return await dbUtils.GetProductDetailsAsync(productId, cancellationToken);
    }
}
