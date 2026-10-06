using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.Repositories;

public class ProductRepository(StoredProcedureExecutor executor) : IProductRepository
{
    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Product_List",
            null,
            HandleResponseWithProductListAsync,
            cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Product_GetDetails",
            command => command.Parameters.AddGuid("@ProductId", productId),
            HandleResponseWithProductDetailsAsync,
            cancellationToken);

    public Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest product,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Product_Create",
            command => AddProductParametersForCreate(command, product),
            reader => StoredProcedureResults.HandleResponseWithCreatedGuidAsync(reader, "ProductId"),
            cancellationToken);

    public Task<ResponseModel<object>> ResetProductStockAsync(CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Product_ResetStock",
            null,
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    private static void AddProductParametersForCreate(SqlCommand command, CreateProductRequest product)
    {
        command.Parameters.AddNVarChar("@Name", FieldLengthConstants.ProductName, product.Name);
        command.Parameters.AddNVarChar("@Category", FieldLengthConstants.ProductCategory, product.Category);
        command.Parameters.AddDecimal("@Price", 12, 2, product.Price);
        command.Parameters.AddInt("@InitialQuantity", product.InitialQuantity);
        command.Parameters.AddNVarChar("@Warehouse", FieldLengthConstants.ProductWarehouse, product.Warehouse);
        command.Parameters.AddNVarChar("@Description", FieldLengthConstants.ProductDescription, product.Description);
    }

    private static async Task<ResponseModel<IReadOnlyList<ProductModel>>> HandleResponseWithProductListAsync(
        SqlDataReader reader)
    {
        var items = new List<ProductModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapProductFromReader(reader));

        return new ResponseModel<IReadOnlyList<ProductModel>>(200, $"{items.Count} products found.", items);
    }

    private static async Task<ResponseModel<ProductDetailsModel>> HandleResponseWithProductDetailsAsync(
        SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<ProductDetailsModel>(404, "Product not found.");

        var product = MapProductFromReader(reader);

        var buyers = new List<ProductBuyerModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            buyers.Add(MapProductBuyerFromReader(reader));

        return new ResponseModel<ProductDetailsModel>(200, "Product found.",
            new ProductDetailsModel { Product = product, Buyers = buyers });
    }

    private static ProductModel MapProductFromReader(SqlDataReader reader) => new()
    {
        ProductId = reader.GetGuid("ProductId"),
        Name = reader.GetString("Name"),
        Category = reader.GetString("Category"),
        Description = reader.GetNullableString("Description"),
        Price = reader.GetDecimal("Price"),
        InitialQuantity = reader.GetInt32("InitialQuantity"),
        QuantityOnHand = reader.GetInt32("QuantityOnHand"),
        SoldQuantity = reader.GetInt32("SoldQuantity"),
        Warehouse = reader.GetString("Warehouse")
    };

    private static ProductBuyerModel MapProductBuyerFromReader(SqlDataReader reader) => new()
    {
        CustomerPurchaseId = reader.GetInt32("CustomerPurchaseId"),
        CustomerId = reader.GetGuid("CustomerId"),
        CustomerFirstName = reader.GetString("FirstName"),
        CustomerLastName = reader.GetString("LastName"),
        CustomerEmail = reader.GetString("Email"),
        PurchasedAt = reader.GetUtcDateTime("PurchasedAt")
    };
}
