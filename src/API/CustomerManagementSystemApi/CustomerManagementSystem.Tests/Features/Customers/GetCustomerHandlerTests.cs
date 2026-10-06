using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class GetCustomerHandlerTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");

    private static CustomerModel MakeCustomer() => new()
    {
        CustomerId = CustomerId,
        FirstName = "Dan",
        LastName = "Frunza",
        Email = "dan@example.com",
        PhoneNumber = "123456789",
        Gender = Gender.Male,
        Status = CustomerStatus.Active,
        EnrollmentDate = new DateOnly(2015, 3, 1),
        AccountCreatedAt = DateTime.UtcNow,
        LastInteractionAt = DateTime.UtcNow,
        Address = new AddressModel
        {
            Country = "Romania",
            County = "Cluj",
            City = "Cluj-Napoca",
            PostalCode = "400001",
            Street = "Main",
            StreetNumber = "1"
        }
    };

    private static async Task<CustomerLookup?> CaptureLookup(string searchTerm)
    {
        var customers = new Mock<ICustomerRepository>();
        CustomerLookup? captured = null;
        customers.Setup(d => d.GetCustomerAsync(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerLookup, CancellationToken>((l, _) => captured = l)
            .ReturnsAsync(new ResponseModel<CustomerModel>(200, "Customer found.", MakeCustomer()));
        var handler = new GetCustomerHandler(customers.Object);

        await handler.HandleAsync(searchTerm, TestContext.Current.CancellationToken);

        return captured;
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetCustomerAsync_RejectsAnEmptySearchVariable_WithoutTouchingTheDb(string? searchTerm)
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomerHandler(customers.Object);

        var result = await handler.HandleAsync(searchTerm, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomerAsync(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerAsync_RejectsASearchVariableThatIsNeitherIdPhoneNumberNorEmail()
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomerHandler(customers.Object);

        var result = await handler.HandleAsync("not-a-valid-search-term", TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomerAsync(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("3fa85f64-5717-4562-b3fc-2c963f66afa6")]
    [InlineData("{3FA85F64-5717-4562-B3FC-2C963F66AFA6}")]
    [InlineData("3fa85f6457174562b3fc2c963f66afa6")]
    public async Task GetCustomerAsync_LooksUpByCustomerId_ForAnyGuidSpelling(string searchTerm)
    {
        var captured = await CaptureLookup(searchTerm);

        Assert.Equal(new CustomerLookup(CustomerId: CustomerId), captured);
    }

    [Fact]
    public async Task GetCustomerAsync_LooksUpByPhoneNumber_ForADigitsOnlySearchTerm()
    {
        Assert.Equal(new CustomerLookup(PhoneNumber: "123456789"), await CaptureLookup("123456789"));
    }

    [Fact]
    public async Task GetCustomerAsync_LooksUpByEmail_ForAnEmailShapedSearchVariable()
    {
        Assert.Equal(new CustomerLookup(Email: "dan@example.com"), await CaptureLookup(" dan@example.com "));
    }
}
