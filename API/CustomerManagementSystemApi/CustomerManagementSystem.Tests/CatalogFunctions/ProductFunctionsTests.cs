using CustomerManagementSystem.BusinessLogic.CatalogFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CatalogFunctions;

public class ProductFunctionsTests
{
    private static readonly Guid ProductId = Guid.Parse("2432276c-4ef0-4e50-abc5-8b5f82297844");

    private static CreateProductRequest ValidRequest() => new()
    {
        Name = "Widget",
        Category = "Gadgets",
        Price = 9.99m,
        InitialQuantity = 10,
        Warehouse = "Cluj",
    };

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task CreateProductAsync_RejectsMissingName_WithoutTouchingTheDb(string? name)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.Name = name;

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task CreateProductAsync_RejectsMissingCategory_WithoutTouchingTheDb(string? category)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.Category = category;

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Category", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateProductAsync_RejectsNonPositivePrice_WithoutTouchingTheDb(decimal price)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.Price = price;

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateProductAsync_RejectsNonPositiveInventoryQuantity_WithoutTouchingTheDb(int quantity)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.InitialQuantity = quantity;

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Inventory", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task CreateProductAsync_RejectsMissingWarehouse_WithoutTouchingTheDb(string? warehouse)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.Warehouse = warehouse;

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Warehouse", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("9.999")]
    [InlineData("10000000000")]
    public async Task CreateProductAsync_RejectsAPriceTheDecimalColumnCantHold_WithoutTouchingTheDb(string price)
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);
        var request = ValidRequest();
        request.Price = decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture);

        var result = await products.CreateProductAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateProductAsync_ReturnsTheDbGeneratedGuid()
    {
        var dbUtils = new Mock<IDbUtils>();
        var newGuid = Guid.Parse("1a52433e-f36b-1410-86a6-008ef0c0e32e");
        dbUtils.Setup(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Product created successfully.", newGuid));
        var products = new ProductFunctions(dbUtils.Object);

        var result = await products.CreateProductAsync(ValidRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal(newGuid, result.Data);
        dbUtils.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetProductDetailsAsync_RejectsAnEmptyProductId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var products = new ProductFunctions(dbUtils.Object);

        var result = await products.GetProductDetailsAsync(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetProductDetailsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProductDetailsAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<ProductDetailsModel>(404, "Product not found.");
        dbUtils.Setup(d => d.GetProductDetailsAsync(ProductId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var products = new ProductFunctions(dbUtils.Object);

        var result = await products.GetProductDetailsAsync(ProductId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetProductDetailsAsync(ProductId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetProductsAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<IReadOnlyList<ProductModel>>(200, "0 products found.", []);
        dbUtils.Setup(d => d.GetProductsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var products = new ProductFunctions(dbUtils.Object);

        var result = await products.GetProductsAsync(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }
}
