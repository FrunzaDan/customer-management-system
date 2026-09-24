using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerDeletionTests
{
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task DeleteCustomerAsync_DelegatesToTheDbLayerWithTheGivenCustomerId_AndLogsAnAuditEntry()
    {
        var customerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deleted successfully.");
        dbUtils.Setup(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var deletion = new CustomerDeletion(dbUtils.Object, auditLogger.Object);

        var result = await deletion.DeleteCustomerAsync(customerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.LogAsync(customerId, PerformedBy, AuditAction.Deleted, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteCustomerAsync_PropagatesABusinessRuleRejection_WithoutModifyingIt()
    {
        // Mirrors the real Customer_Delete rule: an active customer can't be deleted directly.
        var customerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer must be deactivated before it can be deleted.");
        dbUtils.Setup(d => d.DeleteCustomerAsync(customerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var deletion = new CustomerDeletion(dbUtils.Object, auditLogger.Object);

        var result = await deletion.DeleteCustomerAsync(customerId, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(409, result.Status);
        Assert.Equal(expected.ResponseMessage, result.ResponseMessage);
        auditLogger.Verify(a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
