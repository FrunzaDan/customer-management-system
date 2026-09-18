using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerDeletionTests
{
    private const string MerchantId = "TestMerchantID";

    [Fact]
    public async Task DeleteCustomer_DelegatesToTheDbLayerWithTheGivenGuid_AndLogsAnAuditEntry()
    {
        const string guid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(200, "Customer deleted successfully.");
        dbUtils.Setup(d => d.DeleteCustomer(guid, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var deletion = new CustomerDeletion(dbUtils.Object, auditLogger.Object);

        var result = await deletion.DeleteCustomer(guid, MerchantId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.DeleteCustomer(guid, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.Log(guid, MerchantId, "Deleted", null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task DeleteCustomer_PropagatesABusinessRuleRejection_WithoutModifyingIt()
    {
        // Mirrors the real usp_deleteCustomer rule: an active customer can't be deleted directly.
        const string guid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(409, "Customer must be deactivated before it can be deleted.");
        dbUtils.Setup(d => d.DeleteCustomer(guid, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var deletion = new CustomerDeletion(dbUtils.Object, auditLogger.Object);

        var result = await deletion.DeleteCustomer(guid, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(409, result.Status);
        Assert.Equal(expected.ResponseMessage, result.ResponseMessage);
        auditLogger.Verify(a => a.Log(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
