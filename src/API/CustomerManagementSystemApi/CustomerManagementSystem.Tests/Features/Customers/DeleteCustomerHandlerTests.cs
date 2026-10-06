using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class DeleteCustomerHandlerTests
{
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task DeleteCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var customerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deleted successfully.");
        customers.Setup(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new DeleteCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(customerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        customers.Verify(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.LogAsync(customerId, PerformedBy, AuditAction.Deleted, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteCustomerAsync_PropagatesABusinessRuleRejection_WithoutModifyingIt()
    {
        var customerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer must be deactivated before it can be deleted.");
        customers.Setup(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new DeleteCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(customerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(409, result.Status);
        Assert.Equal(expected.ResponseMessage, result.ResponseMessage);
        auditLogger.Verify(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task DeleteCustomerAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new DeleteCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(Guid.Empty, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.DeleteCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
