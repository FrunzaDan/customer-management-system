using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerEditingTests
{
    private const string ValidGuid = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    private const string MerchantId = "TestMerchantID";

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    public async Task EditCustomerFunction_RejectsInvalidGuid_WithoutTouchingTheDb(string? guid)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { Guid = guid };

        var result = await editing.EditCustomerFunction(request, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Guid", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_RejectsInvalidEmail_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { Guid = ValidGuid, Email = "not-an-email" };

        var result = await editing.EditCustomerFunction(request, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_RejectsInvalidMsisdn_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { Guid = ValidGuid, Msisdn = "123" };

        var result = await editing.EditCustomerFunction(request, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("MSISDN", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_AllowsOmittedEmailAndMsisdn()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.EditCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { Guid = ValidGuid, FirstName = "Dan" };

        var result = await editing.EditCustomerFunction(request, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.EditCustomer(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.Log(ValidGuid, MerchantId, "Edited", "Updated: first name", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EditCustomerFunction_PassesTheRequestThroughToTheDb_WhenAllFieldsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.EditCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { Guid = ValidGuid, Email = "dan@example.com", Msisdn = "123456789" };

        var result = await editing.EditCustomerFunction(request, MerchantId, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.EditCustomer(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.Log(ValidGuid, MerchantId, "Edited", "Updated: email, MSISDN", It.IsAny<CancellationToken>()), Times.Once);
    }
}
