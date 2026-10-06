using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Products;

public class GetProductDetailsHandlerTests
{
    private static readonly Guid ProductId = Guid.Parse("2432276c-4ef0-4e50-abc5-8b5f82297844");

    [Fact]
    public async Task GetProductDetailsAsync_RejectsAnEmptyProductId_WithoutTouchingTheDb()
    {
        var products = new Mock<IProductRepository>();
        var handler = new GetProductDetailsHandler(products.Object);

        var result = await handler.HandleAsync(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        products.Verify(d => d.GetProductDetailsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProductDetailsAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var products = new Mock<IProductRepository>();
        var expected = new ResponseModel<ProductDetailsModel>(404, "Product not found.");
        products.Setup(d => d.GetProductDetailsAsync(ProductId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetProductDetailsHandler(products.Object);

        var result = await handler.HandleAsync(ProductId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        products.Verify(d => d.GetProductDetailsAsync(ProductId, It.IsAny<CancellationToken>()), Times.Once);
    }
}
