using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerActivationTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task DeactivateCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deactivated successfully.");
        dbUtils.Setup(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.DeactivateCustomerAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
        dbUtils.Verify(d => d.ReactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.LogAsync(CustomerId, PerformedBy, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateCustomerAsync_DoesNotLogAnAuditEntry_WhenTheDbLayerRejectsIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer is already deactivated.");
        dbUtils.Setup(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.DeactivateCustomerAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        auditLogger.Verify(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task DeactivateCustomerAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.DeactivateCustomerAsync(Guid.Empty, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ReactivateCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer reactivated successfully.");
        dbUtils.Setup(d => d.ReactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.ReactivateCustomerAsync(CustomerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.ReactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
        dbUtils.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.LogAsync(CustomerId, PerformedBy, AuditAction.Reactivated, null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
