using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Products;

public class ResetProductStockHandlerTests
{
    [Fact]
    public async Task ResetProductStockAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var products = new Mock<IProductRepository>();
        var expected = new ResponseModel<object>(200, "Stock reset for 3 products.");
        products.Setup(d => d.ResetProductStockAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new ResetProductStockHandler(products.Object);

        var result = await handler.HandleAsync(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        products.Verify(d => d.ResetProductStockAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
