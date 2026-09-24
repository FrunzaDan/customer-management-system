using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerAuditLoggerTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task LogAsync_PassesTheGivenArgumentsThroughToTheDbLayer()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Edited, "Updated: email", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var logger = new FakeLogger<CustomerAuditLogger>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger);

        await auditLogger.LogAsync(CustomerId, PerformedBy, AuditAction.Edited, "Updated: email", TestContext.Current.CancellationToken);

        dbUtils.Verify(
            d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Edited, "Updated: email", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task LogAsync_DefaultsDetailsToNull_WhenNotProvided()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var logger = new FakeLogger<CustomerAuditLogger>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger);

        await auditLogger.LogAsync(CustomerId, PerformedBy, AuditAction.Deactivated, cancellationToken: TestContext.Current.CancellationToken);

        dbUtils.Verify(
            d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Deactivated, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // Writing an audit entry is best-effort and always runs after the customer mutation
    // it's recording has already succeeded (see CustomerAuditLogger's own comment) — a DB
    // hiccup here must never surface as an exception to the caller. Every other test file
    // mocks ICustomerAuditLogger away, so this is the only place that actually exercises
    // that swallow-and-log behavior against the real class.
    [Fact]
    public async Task LogAsync_SwallowsAnyExceptionFromTheDbLayer_InsteadOfPropagatingIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Created, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection string is unreachable."));
        var logger = new FakeLogger<CustomerAuditLogger>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger);

        var exception = await Record.ExceptionAsync(() => auditLogger.LogAsync(CustomerId, PerformedBy, AuditAction.Created, cancellationToken: TestContext.Current.CancellationToken));

        Assert.Null(exception);
    }

    [Fact]
    public async Task LogAsync_LogsAnError_WhenTheDbLayerThrows()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.LogCustomerAuditAsync(CustomerId, PerformedBy, AuditAction.Created, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection string is unreachable."));
        var logger = new FakeLogger<CustomerAuditLogger>();
        var auditLogger = new CustomerAuditLogger(dbUtils.Object, logger);

        await auditLogger.LogAsync(CustomerId, PerformedBy, AuditAction.Created, cancellationToken: TestContext.Current.CancellationToken);

        var entry = Assert.Single(logger.Collector.GetSnapshot());
        Assert.Equal(LogLevel.Error, entry.Level);
        Assert.Equal(2, entry.Id.Id);
        Assert.IsType<InvalidOperationException>(entry.Exception);
        Assert.Equal(CustomerId.ToString(), entry.GetStructuredStateValue("CustomerId"));
        Assert.Equal(nameof(AuditAction.Created), entry.GetStructuredStateValue("Action"));
    }
}
