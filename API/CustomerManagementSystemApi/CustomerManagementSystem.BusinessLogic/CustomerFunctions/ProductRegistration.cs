using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class ProductRegistration
{
    private readonly IDbUtils _dbUtils;

    public ProductRegistration(IDbUtils dbUtils)
    {
        _dbUtils = dbUtils;
    }

    public async Task<ResponseModel<object>> RegisterProductFunction(ProductModel request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return new ResponseModel<object>(400, "Product name is required.");
        if (request.Name.Length > FieldLengthConstants.ProductName)
            return new ResponseModel<object>(400, "Product name is too long.");

        if (string.IsNullOrWhiteSpace(request.Category))
            return new ResponseModel<object>(400, "Category is required.");
        if (request.Category.Length > FieldLengthConstants.ProductCategory)
            return new ResponseModel<object>(400, "Category is too long.");

        if (request.Comment is not null && request.Comment.Length > FieldLengthConstants.ProductComment)
            return new ResponseModel<object>(400, "Comment is too long.");

        // tbl_products' CK_tbl_products_price only requires >= 0; a strictly positive price
        // is a business rule for a newly listed product, not a DB-level constraint.
        if (request.Price <= 0)
            return new ResponseModel<object>(400, "Price must be greater than zero.");

        if (request.InventoryQuantity <= 0)
            return new ResponseModel<object>(400, "Inventory quantity must be greater than zero.");

        if (string.IsNullOrWhiteSpace(request.Depot))
            return new ResponseModel<object>(400, "Depot is required.");
        if (request.Depot.Length > FieldLengthConstants.ProductDepot)
            return new ResponseModel<object>(400, "Depot is too long.");

        // A new product's identifier is always generated server-side, like a customer's GUID —
        // a client can never choose its own product ID.
        request.Guid = System.Guid.NewGuid().ToString();

        return await _dbUtils.CreateProduct(request, cancellationToken);
    }
}
