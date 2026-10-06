using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class ExportCustomersHandlerTests
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

    [Fact]
    public async Task GetCustomersForExportAsync_RejectsAnUndefinedSortColumn_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new ExportCustomersHandler(customers.Object);
        var request = new ExportCustomersRequest { SortColumn = (CustomerSortColumn)7 };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersForExportAsync_IgnoresPagingAndRequestsTheFullCappedResultInOneCall()
    {
        var customers = new Mock<ICustomerRepository>();
        GetCustomersRequest? captured = null;
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((r, _) => captured = r)
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
                new PagedResponse<CustomerModel>([], 0, 1, 5000)));
        var handler = new ExportCustomersHandler(customers.Object);
        var request = new ExportCustomersRequest
        {
            SearchTerm = " dan ",
            SortColumn = CustomerSortColumn.Email,
            SortDirection = SortDirection.Desc
        };

        await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(1, captured!.PageNumber);
        Assert.Equal(5000, captured.PageSize);
        Assert.Equal("dan", captured.SearchTerm);
        Assert.Equal(CustomerSortColumn.Email, captured.SortColumn);
        Assert.Equal(SortDirection.Desc, captured.SortDirection);
    }

    [Fact]
    public async Task GetCustomersForExportAsync_ReturnsCsvBuiltFromTheDbLayersPagedItems()
    {
        var customers = new Mock<ICustomerRepository>();
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
                new PagedResponse<CustomerModel>([MakeCustomer()], 1, 1, 5000)));
        var handler = new ExportCustomersHandler(customers.Object);

        var result = await handler.HandleAsync(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Contains("Dan", result.Data);
        Assert.Contains("Frunza", result.Data);
    }

    [Fact]
    public async Task GetCustomersForExportAsync_RejectsAResultLargerThanTheExportCap()
    {
        var customers = new Mock<ICustomerRepository>();
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
                new PagedResponse<CustomerModel>([MakeCustomer()], 5001, 1, 5000)));
        var handler = new ExportCustomersHandler(customers.Object);

        var result = await handler.HandleAsync(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Contains("limited to 5000", result.ResponseMessage);
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task GetCustomersForExportAsync_PassesThroughADbLayerFailureUnchanged()
    {
        var customers = new Mock<ICustomerRepository>();
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(500, "Something went wrong."));
        var handler = new ExportCustomersHandler(customers.Object);

        var result = await handler.HandleAsync(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(500, result.Status);
        Assert.Equal("Something went wrong.", result.ResponseMessage);
        Assert.Null(result.Data);
    }
}
