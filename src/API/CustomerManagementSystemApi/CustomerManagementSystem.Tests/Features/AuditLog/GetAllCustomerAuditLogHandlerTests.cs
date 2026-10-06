using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.AuditLog;

public class GetAllCustomerAuditLogHandlerTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetAllCustomerAuditLogAsync_RejectsAnInvalidPageNumber_WithoutTouchingTheDb(int pageNumber)
    {
        var auditLog = new Mock<IAuditLogRepository>();
        var handler = new GetAllCustomerAuditLogHandler(auditLog.Object);

        var result = await handler.HandleAsync(pageNumber, 10, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        auditLog.Verify(d => d.GetAllCustomerAuditLogAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task GetAllCustomerAuditLogAsync_RejectsAnInvalidPageSize_WithoutTouchingTheDb(int pageSize)
    {
        var auditLog = new Mock<IAuditLogRepository>();
        var handler = new GetAllCustomerAuditLogHandler(auditLog.Object);

        var result = await handler.HandleAsync(1, pageSize, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        auditLog.Verify(d => d.GetAllCustomerAuditLogAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAllCustomerAuditLogAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var auditLog = new Mock<IAuditLogRepository>();
        var expected = new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200, "Success!",
            new PagedResponse<GlobalAuditLogEntry>([], 0, 1, 10));
        auditLog.Setup(d => d.GetAllCustomerAuditLogAsync(1, 10, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetAllCustomerAuditLogHandler(auditLog.Object);

        var result = await handler.HandleAsync(1, 10, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        auditLog.Verify(d => d.GetAllCustomerAuditLogAsync(1, 10, It.IsAny<CancellationToken>()), Times.Once);
    }
}
