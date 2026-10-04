using System.Net;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Endpoints;

public class ProductEndpointTests
{
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static ProductModel Latte() => new()
    {
        ProductId = ProductId,
        Name = "Latte",
        Category = "Coffee",
        Price = 14.5m,
        InitialQuantity = 10,
        QuantityOnHand = 7,
        SoldQuantity = 3,
        Warehouse = "Cluj",
    };

    [Fact]
    public async Task GetAll_ReturnsTheCatalogue()
    {
        await using var api = new ApiHost();
        api.Db.Setup(d => d.GetProductsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<IReadOnlyList<ProductModel>>(200, "", [Latte()]));

        var response = await api.GetAsync("/api/product/all");

        var product = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data")[0];
        Assert.Equal(ProductId, product.GetProperty("productId").GetGuid());
        Assert.Equal(14.5m, product.GetProperty("price").GetDecimal());
        Assert.Equal(7, product.GetProperty("quantityOnHand").GetInt32());
    }

    [Fact]
    public async Task GetGet_ReturnsTheProductWithItsBuyers()
    {
        await using var api = new ApiHost();
        api.Db.Setup(d => d.GetProductDetailsAsync(ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<ProductDetailsModel>(200, "",
                new ProductDetailsModel { Product = Latte(), Buyers = [] }));

        var response = await api.GetAsync($"/api/product/get?productId={ProductId}");

        var details = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data");
        Assert.Equal("Latte", details.GetProperty("product").GetProperty("name").GetString());
        Assert.Equal(0, details.GetProperty("buyers").GetArrayLength());
    }

    [Fact]
    public async Task PostCreate_SendsTheBodyToTheDb_AndReturnsTheNewId()
    {
        await using var api = new ApiHost();
        CreateProductRequest? sent = null;
        api.Db.Setup(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateProductRequest, CancellationToken>((request, _) => sent = request)
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Product created.", ProductId));

        var response = await api.PostAsync("/api/product/create",
            new { name = "Latte", category = "Coffee", price = 14.5m, initialQuantity = 10, warehouse = "Cluj" });

        var envelope = await ApiHost.ReadEnvelopeAsync(response);
        Assert.Equal(ProductId, envelope.GetProperty("data").GetGuid());
        Assert.NotNull(sent);
        Assert.Equal("Latte", sent.Name);
        Assert.Equal(14.5m, sent.Price);
        Assert.Equal(10, sent.InitialQuantity);
    }

    [Fact]
    public async Task PostCreate_AnInvalidPrice_IsA400Problem_WithoutTouchingTheDb()
    {
        await using var api = new ApiHost();

        var response = await api.PostAsync("/api/product/create",
            new { name = "Latte", category = "Coffee", price = 0, initialQuantity = 10, warehouse = "Cluj" });

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Price must be greater than zero.", problem.GetProperty("detail").GetString());
        api.Db.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PostResetStock_ResetsEveryProduct()
    {
        await using var api = new ApiHost();
        api.Db.Setup(d => d.ResetProductStockAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Stock reset."));

        var response = await api.PostAsync("/api/product/reset-stock");

        await ApiHost.ReadEnvelopeAsync(response);
        api.Db.Verify(d => d.ResetProductStockAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
