using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerCreationTests
{
    private const string PerformedBy = "TestMerchant";

    private static CreateCustomerRequest ValidRequest() => new()
    {
        FirstName = "Dan",
        LastName = "Frunza",
        Email = "dan@example.com",
        PhoneNumber = "123456789",
        Address = new AddressRequest
        {
            Country = "Romania", County = "Cluj", City = "Cluj-Napoca", PostalCode = "400001", Street = "Main", StreetNumber = "1"
        },
    };

    [Theory]
    [InlineData(null, "Frunza")]
    [InlineData("", "Frunza")]
    [InlineData("Dan", null)]
    [InlineData("Dan", "")]
    public async Task CreateCustomerAsync_RejectsMissingName_WithoutTouchingTheDb(string? firstName,
        string? lastName)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.FirstName = firstName;
        request.LastName = lastName;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task CreateCustomerAsync_RejectsInvalidEmail_WithoutTouchingTheDb(string? email)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Email = email;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnEmailLongerThanTheColumn_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Email = new string('a', 250) + "@x.ro"; // 255 chars, one over NVARCHAR(254)

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("Email is too long.", result.ResponseMessage);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    public async Task CreateCustomerAsync_RejectsInvalidPhoneNumber_WithoutTouchingTheDb(string? phoneNumber)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.PhoneNumber = phoneNumber;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("phone number", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAMissingAddress_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Address = null;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Address", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnAddressWithAMissingField_WithoutTouchingTheDb()
    {
        // Every CustomerAddress column is NOT NULL, so this would otherwise be a 500 from the insert.
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Address!.City = " ";

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("City is required.", result.ResponseMessage);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnUndefinedGender_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Gender = (Gender)7;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Gender", result.ResponseMessage);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(CustomerStatus.Active)]
    [InlineData(CustomerStatus.Test)] // the About page's "add 50 test customers" bulk generator
    public async Task CreateCustomerAsync_AcceptsNoStatusActiveOrTest(CustomerStatus? status)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Customer created successfully.", Guid.NewGuid()));
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Status = status;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
    }

    [Theory]
    [InlineData(CustomerStatus.Deactivated)]
    [InlineData((CustomerStatus)1)]
    public async Task CreateCustomerAsync_RejectsAnyOtherStatus_WithoutTouchingTheDb(CustomerStatus status)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Status = status;

        var result = await registration.CreateCustomerAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_ReturnsTheDbGeneratedCustomerId_AndAuditLogsAgainstIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var newGuid = Guid.Parse("1352433e-f36b-1410-86a6-008ef0c0e32e");
        dbUtils.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Customer created successfully.", newGuid));
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);

        var result = await registration.CreateCustomerAsync(ValidRequest(), PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Equal(newGuid, result.Data);
        auditLogger.Verify(
            a => a.LogAsync(newGuid, PerformedBy, AuditAction.Created, "Email: dan@example.com, Phone number: 123456789",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateCustomerAsync_DoesNotAuditLog_WhenTheDbRejectsIt()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        dbUtils.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(409, "Email already exists."));
        var registration = new CustomerCreation(dbUtils.Object, auditLogger.Object);

        var result = await registration.CreateCustomerAsync(ValidRequest(), PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(409, result.Status);
        auditLogger.Verify(
            a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(),
                It.IsAny<CancellationToken>()), Times.Never);
    }
}
