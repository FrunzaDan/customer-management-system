using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using CustomerManagementSystem.Domain.Constants;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Products;

public class CreateProductHandlerTests
{
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
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.Name = name;

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task CreateProductAsync_RejectsMissingCategory_WithoutTouchingTheDb(string? category)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.Category = category;

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Category", result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateProductAsync_RejectsNonPositivePrice_WithoutTouchingTheDb(decimal price)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.Price = price;

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateProductAsync_RejectsNonPositiveInventoryQuantity_WithoutTouchingTheDb(int quantity)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.InitialQuantity = quantity;

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Inventory", result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task CreateProductAsync_RejectsMissingWarehouse_WithoutTouchingTheDb(string? warehouse)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.Warehouse = warehouse;

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Warehouse", result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("9.999")]
    [InlineData("10000000000")]
    public async Task CreateProductAsync_RejectsAPriceTheDecimalColumnCantHold_WithoutTouchingTheDb(string price)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        request.Price = decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture);

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(nameof(CreateProductRequest.Name), FieldLengthConstants.ProductName, "Product name is too long.")]
    [InlineData(nameof(CreateProductRequest.Category), FieldLengthConstants.ProductCategory, "Category is too long.")]
    [InlineData(nameof(CreateProductRequest.Description), FieldLengthConstants.ProductDescription, "Description is too long.")]
    [InlineData(nameof(CreateProductRequest.Warehouse), FieldLengthConstants.ProductWarehouse, "Warehouse is too long.")]
    public async Task CreateProductAsync_RejectsAFieldLongerThanItsColumn_WithoutTouchingTheDb(string field,
        int maxLength, string expectedMessage)
    {
        var products = new Mock<IProductRepository>();
        var handler = new CreateProductHandler(products.Object);
        var request = ValidRequest();
        typeof(CreateProductRequest).GetProperty(field)!.SetValue(request, new string('a', maxLength + 1));

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal(expectedMessage, result.ResponseMessage);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateProductAsync_ReturnsTheDbGeneratedGuid()
    {
        var products = new Mock<IProductRepository>();
        var newGuid = Guid.Parse("1a52433e-f36b-1410-86a6-008ef0c0e32e");
        products.Setup(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Product created successfully.", newGuid));
        var handler = new CreateProductHandler(products.Object);

        var result = await handler.HandleAsync(ValidRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal(newGuid, result.Data);
        products.Verify(d => d.CreateProductAsync(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
