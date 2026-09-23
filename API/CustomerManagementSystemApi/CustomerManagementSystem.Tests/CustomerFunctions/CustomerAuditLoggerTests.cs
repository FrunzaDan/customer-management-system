using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Logging;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerAuditLoggerTests
{
    private static readonly Guid CustomerGuid = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private const string MerchantId = "TestMerchantID";

    [Fact]
    public async Task Log_PassesTheGivenArgumentsThroughToTheDbLayer()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Edited, "Updated: email", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var logger = new Mock<ILogger<CustomerAuditLogger>>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger.Object);

        await auditLogger.Log(CustomerGuid, MerchantId, AuditAction.Edited, "Updated: email", TestContext.Current.CancellationToken);

        dbUtils.Verify(
            d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Edited, "Updated: email", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Log_DefaultsDetailsToNull_WhenNotProvided()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var logger = new Mock<ILogger<CustomerAuditLogger>>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger.Object);

        await auditLogger.Log(CustomerGuid, MerchantId, AuditAction.Deactivated, cancellationToken: TestContext.Current.CancellationToken);

        dbUtils.Verify(
            d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // Writing an audit entry is best-effort and always runs after the customer mutation
    // it's recording has already succeeded (see CustomerAuditLogger's own comment) — a DB
    // hiccup here must never surface as an exception to the caller. Every other test file
    // mocks ICustomerAuditLogger away, so this is the only place that actually exercises
    // that swallow-and-log behavior against the real class.
    [Fact]
    public async Task Log_SwallowsAnyExceptionFromTheDbLayer_InsteadOfPropagatingIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Created, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection string is unreachable."));
        var logger = new Mock<ILogger<CustomerAuditLogger>>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger.Object);

        var exception = await Record.ExceptionAsync(() => auditLogger.Log(CustomerGuid, MerchantId, AuditAction.Created, cancellationToken: TestContext.Current.CancellationToken));

        Assert.Null(exception);
    }

    [Fact]
    public async Task Log_LogsAnError_WhenTheDbLayerThrows()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAudit(CustomerGuid, MerchantId, AuditAction.Created, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection string is unreachable."));
        var logger = new Mock<ILogger<CustomerAuditLogger>>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger.Object);

        await auditLogger.Log(CustomerGuid, MerchantId, AuditAction.Created, cancellationToken: TestContext.Current.CancellationToken);

        logger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.Is<Exception>(e => e is InvalidOperationException),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }
}
