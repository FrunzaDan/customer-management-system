using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class DeactivateCustomerHandlerTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");

    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task DeactivateCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deactivated successfully.");
        customers.Setup(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new DeactivateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        customers.Verify(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
        customers.Verify(d => d.ReactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.LogAsync(CustomerId, PerformedBy, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateCustomerAsync_DoesNotLogAnAuditEntry_WhenTheDbLayerRejectsIt()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer is already deactivated.");
        customers.Setup(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new DeactivateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        auditLogger.Verify(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task DeactivateCustomerAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new DeactivateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(Guid.Empty, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
