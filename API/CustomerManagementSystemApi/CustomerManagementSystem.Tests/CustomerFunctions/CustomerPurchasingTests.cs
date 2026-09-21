using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerPurchasingTests
{
    private const string CustomerGuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    private const string ProductGuid = "2432276c-4ef0-4e50-abc5-8b5f82297844";
    private const string MerchantId = "TestMerchantID";

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public async Task PurchaseProduct_RejectsAnInvalidCustomerGuid_WithoutTouchingTheDb(string? customerGuid)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProduct(customerGuid!, ProductGuid, MerchantId,
            TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(
            d => d.PurchaseProduct(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public async Task PurchaseProduct_RejectsAnInvalidProductGuid_WithoutTouchingTheDb(string? productGuid)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProduct(CustomerGuid, productGuid!, MerchantId,
            TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(
            d => d.PurchaseProduct(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PurchaseProduct_LogsAnAuditEntryNamingTheProduct_AndDropsTheNameFromTheResponse()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.PurchaseProduct(CustomerGuid, ProductGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Purchase recorded successfully.", "Aerobook 14 Pro"));
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProduct(CustomerGuid, ProductGuid, MerchantId,
            TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal("Purchase recorded successfully.", result.ResponseMessage);
        Assert.Null(result.Data);
        auditLogger.Verify(
            a => a.Log(CustomerGuid, MerchantId, "Purchased", "Product: Aerobook 14 Pro",
                It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(404)] // customer or product not found
    [InlineData(409)] // deactivated customer, or out of stock
    [InlineData(500)]
    public async Task PurchaseProduct_PassesThroughADbLayerRejectionUnchanged_WithoutLoggingAnAuditEntry(int status)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var expected = new ResponseModel<object>(status, "Rejected.");
        dbUtils.Setup(d => d.PurchaseProduct(CustomerGuid, ProductGuid, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        var purchasing = new CustomerPurchasing(dbUtils.Object, auditLogger.Object);

        var result = await purchasing.PurchaseProduct(CustomerGuid, ProductGuid, MerchantId,
            TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        auditLogger.Verify(
            a => a.Log(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
                It.IsAny<CancellationToken>()), Times.Never);
    }
}
