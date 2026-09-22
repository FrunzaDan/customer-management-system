using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class ProductRegistrationTests
{
    private static ProductModel ValidRequest() => new()
    {
        Name = "Widget",
        Category = "Gadgets",
        Price = 9.99m,
        InventoryQuantity = 10,
        Depot = "Cluj",
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
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Never);
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
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Never);
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
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task RegisterProductFunction_RejectsNonPositiveInventoryQuantity_WithoutTouchingTheDb(int quantity)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.InventoryQuantity = quantity;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Inventory", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public async Task RegisterProductFunction_RejectsMissingDepot_WithoutTouchingTheDb(string? depot)
    {
        var dbUtils = new Mock<IDbUtils>();
        var registration = new ProductRegistration(dbUtils.Object);
        var request = ValidRequest();
        request.Depot = depot;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Depot", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterProductFunction_AlwaysGeneratesAFreshServerSideGuid_IgnoringAnyClientSuppliedValue()
    {
        var dbUtils = new Mock<IDbUtils>();
        ProductModel? capturedRequest = null;
        dbUtils.Setup(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()))
            .Callback<ProductModel, CancellationToken>((p, _) => capturedRequest = p)
            .ReturnsAsync(new ResponseModel<object>(200, "Product created successfully."));
        var registration = new ProductRegistration(dbUtils.Object);
        const string clientSuppliedGuid = "11111111-1111-1111-1111-111111111111";
        var request = ValidRequest();
        request.Guid = clientSuppliedGuid;

        var result = await registration.RegisterProductFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.CreateProduct(It.IsAny<ProductModel>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(capturedRequest!.Guid);
        Assert.NotEqual(clientSuppliedGuid, capturedRequest.Guid);
        Assert.True(Guid.TryParse(capturedRequest.Guid, out _));
    }
}
