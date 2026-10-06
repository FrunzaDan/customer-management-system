using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Purchases;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Purchases;

public class GetCustomerPurchasesHandlerTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");

    [Fact]
    public async Task GetCustomerPurchasesAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var purchases = new Mock<IPurchaseRepository>();
        var handler = new GetCustomerPurchasesHandler(purchases.Object);

        var result = await handler.HandleAsync(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        purchases.Verify(d => d.GetCustomerPurchasesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerPurchasesAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var purchases = new Mock<IPurchaseRepository>();
        var expected = new ResponseModel<IReadOnlyList<PurchaseModel>>(200, "0 purchases found.", []);
        purchases.Setup(d => d.GetCustomerPurchasesAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetCustomerPurchasesHandler(purchases.Object);

        var result = await handler.HandleAsync(CustomerId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        purchases.Verify(d => d.GetCustomerPurchasesAsync(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
    }
}
