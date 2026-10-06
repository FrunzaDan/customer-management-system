using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using Moq;

namespace CustomerManagementSystem.Tests.Features.AuditLog;

public class GetCustomerAuditLogHandlerTests
{
    [Fact]
    public async Task GetCustomerAuditLogAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var auditLog = new Mock<IAuditLogRepository>();
        var handler = new GetCustomerAuditLogHandler(auditLog.Object);

        var result = await handler.HandleAsync(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        auditLog.Verify(d => d.GetCustomerAuditLogAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
