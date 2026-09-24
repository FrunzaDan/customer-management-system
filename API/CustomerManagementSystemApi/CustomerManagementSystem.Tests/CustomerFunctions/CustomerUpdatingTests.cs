using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerUpdatingTests
{
    private static readonly Guid ValidCustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private const string PerformedBy = "TestMerchant";

    [Fact]
    public async Task UpdateCustomerAsync_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = Guid.Empty };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("customer ID", result.ResponseMessage);
        dbUtils.Verify(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCustomerAsync_RejectsInvalidEmail_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, Email = "not-an-email" };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        dbUtils.Verify(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCustomerAsync_RejectsInvalidPhoneNumber_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, PhoneNumber = "123" };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("phone number", result.ResponseMessage);
        dbUtils.Verify(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCustomerAsync_RejectsAnUndefinedGender_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, Gender = (Gender)3 };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Gender", result.ResponseMessage);
        dbUtils.Verify(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCustomerAsync_AllowsOmittedEmailAndPhoneNumber()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest { CustomerId = ValidCustomerId, FirstName = "Dan" };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.UpdateCustomerAsync(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.LogAsync(ValidCustomerId, PerformedBy, AuditAction.Edited, "Updated: first name", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateCustomerAsync_PassesTheRequestThroughToTheDb_WhenAllFieldsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Customer updated successfully."));
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);
        var request = new UpdateCustomerRequest
        {
            CustomerId = ValidCustomerId, Email = "dan@example.com", PhoneNumber = "123456789", BirthDate = new DateOnly(1990, 1, 2)
        };

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.UpdateCustomerAsync(request, It.IsAny<CancellationToken>()), Times.Once);
        auditLogger.Verify(a => a.LogAsync(ValidCustomerId, PerformedBy, AuditAction.Edited, "Updated: email, phone number, birth date", It.IsAny<CancellationToken>()), Times.Once);
    }

    public static TheoryData<UpdateCustomerRequest, string> BlankOrImpossibleUpdates => new()
    {
        { new UpdateCustomerRequest { CustomerId = ValidCustomerId, FirstName = "   " }, "First name cannot be blank." },
        { new UpdateCustomerRequest { CustomerId = ValidCustomerId, LastName = "" }, "Last name cannot be blank." },
        { new UpdateCustomerRequest { CustomerId = ValidCustomerId, Email = "" }, "Invalid Email." },
        { new UpdateCustomerRequest { CustomerId = ValidCustomerId, PhoneNumber = "" }, "Invalid phone number." },
        { new UpdateCustomerRequest { CustomerId = ValidCustomerId, Address = new AddressRequest { City = " " } }, "City cannot be blank." },
        {
            new UpdateCustomerRequest { CustomerId = ValidCustomerId, BirthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1) },
            "Birth date cannot be in the future."
        }
    };

    [Theory]
    [MemberData(nameof(BlankOrImpossibleUpdates))]
    public async Task UpdateCustomerAsync_RejectsBlankFieldsAndAFutureBirthDate_WithoutTouchingTheDb(
        UpdateCustomerRequest request, string expectedMessage)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var editing = new CustomerUpdating(dbUtils.Object, auditLogger.Object);

        var result = await editing.UpdateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal(expectedMessage, result.ResponseMessage);
        dbUtils.Verify(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
