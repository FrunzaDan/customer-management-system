using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class ReactivateCustomerHandlerTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");

    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task ReactivateCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer reactivated successfully.");
        customers.Setup(d => d.ReactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new ReactivateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        customers.Verify(d => d.ReactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
        customers.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.LogAsync(CustomerId, PerformedBy, AuditAction.Reactivated, null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
