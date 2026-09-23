using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class ProductRegistrationTests
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
    public async Task RegisterProductFunction_RejectsMissingName_WithoutTouchingTheDb(string? name)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Name = name;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task RegisterProductFunction_RejectsMissingCategory_WithoutTouchingTheDb(string? category)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Category = category;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Category", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task RegisterProductFunction_RejectsNonPositivePrice_WithoutTouchingTheDb(decimal price)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Price = price;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task RegisterProductFunction_RejectsNonPositiveInventoryQuantity_WithoutTouchingTheDb(int quantity)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.InitialQuantity = quantity;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Inventory", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task RegisterProductFunction_RejectsMissingWarehouse_WithoutTouchingTheDb(string? warehouse)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Warehouse = warehouse;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Warehouse", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("9.999")]
    [InlineData("10000000000")]
    public async Task RegisterProductFunction_RejectsAPriceTheDecimalColumnCantHold_WithoutTouchingTheDb(string price)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Price = decimal.Parse(price, System.Globalization.CultureInfo.InvariantCulture);

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Price", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterProductFunction_ReturnsTheDbGeneratedGuid()
    {
        var dbUtils = new Mock<IDbUtils>();
        var newGuid = Guid.Parse("1a52433e-f36b-1410-86a6-008ef0c0e32e");
        dbUtils.Setup(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Product created successfully.", newGuid));
        var registration = new ProductRegistration(dbUtils.Object);

        var result = await registration.RegisterProductFunction(ValidRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal(newGuid, result.Data);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<CreateProductRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
