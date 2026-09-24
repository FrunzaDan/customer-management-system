using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerPurchasingTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private static readonly Guid ProductId = Guid.Parse("2432276c-4ef0-4e50-abc5-8b5f82297844");
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task PurchaseProductAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProductAsync(Guid.Empty, ProductId, PerformedBy,
            TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(
            d => d.PurchaseProductAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PurchaseProductAsync_RejectsAnEmptyProductId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProductAsync(CustomerId, Guid.Empty, PerformedBy,
            TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(
            d => d.PurchaseProductAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PurchaseProductAsync_LogsAnAuditEntryNamingTheProduct_AndDropsTheNameFromTheResponse()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.PurchaseProductAsync(CustomerId, ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<string>(200, "Purchase recorded successfully.", "Aerobook 14 Pro"));
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProductAsync(CustomerId, ProductId, PerformedBy,
            TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal("Purchase recorded successfully.", result.ResponseMessage);
        Assert.Null(result.Data);
        auditLogger.Verify(
            a => a.LogAsync(CustomerId, PerformedBy, AuditAction.Purchased, "Product: Aerobook 14 Pro",
                It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(404)] // customer or product not found
    [InlineData(409)] // deactivated customer, or out of stock
    [InlineData(500)]
    public async Task PurchaseProductAsync_PassesThroughADbLayerRejectionUnchanged_WithoutLoggingAnAuditEntry(int status)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.PurchaseProductAsync(CustomerId, ProductId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<string>(status, "Rejected."));
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProductAsync(CustomerId, ProductId, PerformedBy,
            TestContext.Current.CancellationToken);

        Assert.Equal(status, result.Status);
        Assert.Equal("Rejected.", result.ResponseMessage);
        Assert.Null(result.Data);
        auditLogger.Verify(
            a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(),
                It.IsAny<CancellationToken>()), Times.Never);
    }
}
