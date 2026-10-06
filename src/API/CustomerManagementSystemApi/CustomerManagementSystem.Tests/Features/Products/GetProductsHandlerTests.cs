using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Products;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Products;

public class GetProductsHandlerTests
{
    [Fact]
    public async Task GetProductsAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var products = new Mock<IProductRepository>();
        var expected = new ResponseModel<IReadOnlyList<ProductModel>>(200, "0 products found.", []);
        products.Setup(d => d.GetProductsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetProductsHandler(products.Object);

        var result = await handler.HandleAsync(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }
}
