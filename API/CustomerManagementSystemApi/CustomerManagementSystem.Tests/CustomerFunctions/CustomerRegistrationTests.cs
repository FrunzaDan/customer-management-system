using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerRegistrationTests
{
    private const string MerchantId = "TestMerchantID";

    [Theory]
    [InlineData(null, "Frunza")]
    [InlineData("", "Frunza")]
    [InlineData("Dan", null)]
    [InlineData("Dan", "")]
    public async Task RegisterCustomerFunction_RejectsMissingName_WithoutTouchingTheDb(string? firstName,
        string? lastName)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel
        {
            FirstName = firstName, LastName = lastName, Email = "dan@example.com", Msisdn = "123456789"
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(400, result.Status);
        Assert.Contains("name", result.ResponseMessage, StringComparison.OrdinalIgnoreCase);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task RegisterCustomerFunction_RejectsInvalidEmail_WithoutTouchingTheDb(string? email)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { FirstName = "Dan", LastName = "Frunza", Email = email, Msisdn = "123456789" };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(400, result.Status);
        Assert.Contains("Email", result.ResponseMessage);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    public async Task RegisterCustomerFunction_RejectsInvalidMsisdn_WithoutTouchingTheDb(string? msisdn)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel { FirstName = "Dan", LastName = "Frunza", Email = "dan@example.com", Msisdn = msisdn };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(400, result.Status);
        Assert.Contains("MSISDN", result.ResponseMessage);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterCustomerFunction_RejectsAMissingAddress_WithoutTouchingTheDb()
    {
        // usp_createCustomer's address parameters have no SQL-side defaults, so without this
        // check a missing Address would otherwise surface as an opaque 500 instead of a 400.
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel
        {
            FirstName = "Dan", LastName = "Frunza", Email = "dan@example.com", Msisdn = "123456789", Address = null
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(400, result.Status);
        Assert.Contains("Address", result.ResponseMessage);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterCustomerFunction_DefaultsCustomerStatusToActive_WhenNoneIsSupplied()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        CustomerModel? capturedRequest = null;
        dbUtils.Setup(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerModel, CancellationToken>((c, _) => capturedRequest = c)
            .ReturnsAsync(new ResponseModel<object>(200, "Customer created successfully."));
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel
        {
            FirstName = "Dan",
            LastName = "Frunza",
            Email = "dan@example.com",
            Msisdn = "123456789",
            Address = new AddressModel { Country = "Romania" },
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(200, result.Status);
        Assert.Equal(CustomerStatusCodes.Active, capturedRequest!.CustomerStatus);
    }

    [Fact]
    public async Task RegisterCustomerFunction_AllowsExplicitlyRequestingTheTestStatus()
    {
        // Used by the About page's "add 50 test customers" bulk generator.
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        CustomerModel? capturedRequest = null;
        dbUtils.Setup(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerModel, CancellationToken>((c, _) => capturedRequest = c)
            .ReturnsAsync(new ResponseModel<object>(200, "Customer created successfully."));
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel
        {
            FirstName = "Dan",
            LastName = "Frunza",
            Email = "dan@example.com",
            Msisdn = "123456789",
            Address = new AddressModel { Country = "Romania" },
            CustomerStatus = CustomerStatusCodes.Test,
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(200, result.Status);
        Assert.Equal(CustomerStatusCodes.Test, capturedRequest!.CustomerStatus);
    }

    [Theory]
    [InlineData(1903)]
    [InlineData(1)]
    public async Task RegisterCustomerFunction_RejectsAnyOtherStatus_WithoutTouchingTheDb(int status)
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        var request = new CustomerModel
        {
            Email = "dan@example.com",
            Msisdn = "123456789",
            Address = new AddressModel { Country = "Romania" },
            CustomerStatus = status,
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RegisterCustomerFunction_AlwaysGeneratesAFreshServerSideGuid_IgnoringAnyClientSuppliedValue()
    {
        var dbUtils = new Mock<IDbUtils>();
        var auditLogger = new Mock<ICustomerAuditLogger>();
        CustomerModel? capturedRequest = null;
        dbUtils.Setup(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerModel, CancellationToken>((c, _) => capturedRequest = c)
            .ReturnsAsync(new ResponseModel<object>(200, "Customer created successfully."));
        var registration = new CustomerRegistration(dbUtils.Object, auditLogger.Object);
        const string clientSuppliedGuid = "11111111-1111-1111-1111-111111111111";
        var request = new CustomerModel
        {
            Guid = clientSuppliedGuid,
            FirstName = "Dan",
            LastName = "Frunza",
            Email = "dan@example.com",
            Msisdn = "123456789",
            Address = new AddressModel { Country = "Romania" },
        };

        var result = await registration.RegisterCustomerFunction(request, MerchantId);

        Assert.Equal(200, result.Status);
        dbUtils.Verify(d => d.RegisterCustomer(It.IsAny<CustomerModel>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(capturedRequest!.Guid);
        Assert.NotEqual(clientSuppliedGuid, capturedRequest.Guid);
        Assert.True(Guid.TryParse(capturedRequest.Guid, out _));
        auditLogger.Verify(
            a => a.Log(capturedRequest.Guid!, MerchantId, "Created", "Email: dan@example.com, MSISDN: 123456789",
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
