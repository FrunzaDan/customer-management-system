using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerActivationTests
{
    private const string Guid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    private const string MerchantId = "TestMerchantID";

    [Fact]
    public async Task DeactivateCustomer_DelegatesToTheDbLayerWithTheGivenGuid_AndLogsAnAuditEntry()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deactivated successfully.");
        dbUtils.Setup(d => d.DeactivateCustomer(Guid, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.DeactivateCustomer(Guid, MerchantId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.DeactivateCustomer(Guid, It.IsAny<CancellationToken>()), Times.Once);
        dbUtils.Verify(d => d.ReactivateCustomer(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.Log(Guid, MerchantId, "Deactivated", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeactivateCustomer_DoesNotLogAnAuditEntry_WhenTheDbLayerRejectsIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer already deactivated or update failed.");
        dbUtils.Setup(d => d.DeactivateCustomer(Guid, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.DeactivateCustomer(Guid, MerchantId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        auditLogger.Verify(a => a.Log(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ReactivateCustomer_DelegatesToTheDbLayerWithTheGivenGuid_AndLogsAnAuditEntry()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer reactivated successfully.");
        dbUtils.Setup(d => d.ReactivateCustomer(Guid, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var activation = new CustomerActivation(dbUtils.Object, auditLogger.Object);

        var result = await activation.ReactivateCustomer(Guid, MerchantId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.ReactivateCustomer(Guid, It.IsAny<CancellationToken>()), Times.Once);
        dbUtils.Verify(d => d.DeactivateCustomer(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        auditLogger.Verify(a => a.Log(Guid, MerchantId, "Reactivated", null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
