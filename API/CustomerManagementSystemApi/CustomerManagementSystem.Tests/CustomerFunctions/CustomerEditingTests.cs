using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerEditingTests
{
    private static readonly Guid ValidCustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task EditCustomerFunction_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        // A malformed GUID is already rejected by model binding; Guid.Empty is what a missing
        // one binds to.
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = Guid.Empty };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("customer ID", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_RejectsInvalidEmail_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, Email = "not-an-email" };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_RejectsInvalidPhoneNumber_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, PhoneNumber = "123" };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("phone number", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_RejectsAnUndefinedGender_WithoutTouchingTheDb()
    {
        // A JSON number binds to the enum even when it isn't one of its members.
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, Gender = (Gender)3 };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Gender", result.ResponseMessage);
        dbUtils.Verify(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EditCustomerFunction_AllowsOmittedEmailAndPhoneNumber()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, FirstName = "Dan" };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.EditCustomer(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.Log(ValidCustomerId, PerformedBy, AuditAction.Edited, "Updated: first name", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task EditCustomerFunction_PassesTheRequestThroughToTheDb_WhenAllFieldsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.EditCustomer(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerEditing(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest
        {
            CustomerId = ValidCustomerId, Email = "dan@example.com", PhoneNumber = "123456789", BirthDate = new DateOnly(1990, 1, 2)
        };

        var result = await editing.EditCustomerFunction(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.EditCustomer(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.Log(ValidCustomerId, PerformedBy, AuditAction.Edited, "Updated: email, phone number, birth date", It.IsAny<CancellationToken>()), Times.Once);
    }
}
