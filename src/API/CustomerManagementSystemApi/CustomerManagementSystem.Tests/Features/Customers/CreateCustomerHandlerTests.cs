using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class CreateCustomerHandlerTests
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
            Country = "Romania",
            County = "Cluj",
            City = "Cluj-Napoca",
            PostalCode = "400001",
            Street = "Main",
            StreetNumber = "1"
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
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.FirstName = firstName;
        request.LastName = lastName;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task CreateCustomerAsync_RejectsInvalidEmail_WithoutTouchingTheDb(string? email)
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Email = email;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnEmailLongerThanTheColumn_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Email = new string('a', 250) + "@x.ro";

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("Email is too long.", result.ResponseMessage);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    public async Task CreateCustomerAsync_RejectsInvalidPhoneNumber_WithoutTouchingTheDb(string? phoneNumber)
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.PhoneNumber = phoneNumber;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("phone number", result.ResponseMessage);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAMissingAddress_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Address = null;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Address", result.ResponseMessage);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnAddressWithAMissingField_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Address!.City = " ";

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("City is required.", result.ResponseMessage);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAnUndefinedGender_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Gender = (Gender)7;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("Gender", result.ResponseMessage);
    }

    [Fact]
    public async Task CreateCustomerAsync_RejectsAFutureEnrollmentDate_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.EnrollmentDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("Enrollment date cannot be in the future.", result.ResponseMessage);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(CustomerStatus.Active)]
    [InlineData(CustomerStatus.Test)]
    public async Task CreateCustomerAsync_AcceptsNoStatusActiveOrTest(CustomerStatus? status)
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        customers.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Customer created successfully.", Guid.NewGuid()));
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Status = status;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
    }

    [Theory]
    [InlineData(CustomerStatus.Deactivated)]
    [InlineData((CustomerStatus)1)]
    public async Task CreateCustomerAsync_RejectsAnyOtherStatus_WithoutTouchingTheDb(CustomerStatus status)
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);
        var request = ValidRequest();
        request.Status = status;

        var result = await handler.HandleAsync(request, PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCustomerAsync_ReturnsTheDbGeneratedCustomerId_AndAuditLogsAgainstIt()
    {
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var newGuid = Guid.Parse("1352433e-f36b-1410-86a6-008ef0c0e32e");
        customers.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Customer created successfully.", newGuid));
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(ValidRequest(), PerformedBy, TestContext.Current.CancellationToken);

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
        var customers = new Mock<ICustomerRepository>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        customers.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<Guid?>(409, "Email already exists."));
        var handler = new CreateCustomerHandler(customers.Object, auditLogger.Object);

        var result = await handler.HandleAsync(ValidRequest(), PerformedBy, TestContext.Current.CancellationToken);

        Assert.Equal(409, result.Status);
        auditLogger.Verify(
            a => a.LogAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(), It.IsAny<string?>(),
                It.IsAny<CancellationToken>()), Times.Never);
    }
}
