using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Constants;

namespace CustomerManagementSystem.BusinessLogic.Features.Products;

public class CreateProductHandler(IProductRepository products)
{
    private const decimal MaxPrice = 9_999_999_999.99m;

    public async Task<ResponseModel<Guid?>> HandleAsync(CreateProductRequest request,
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

        return await products.CreateProductAsync(request, cancellationToken);
    }
}
