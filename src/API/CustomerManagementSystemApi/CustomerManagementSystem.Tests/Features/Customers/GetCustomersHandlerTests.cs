using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Customers;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Customers;

public class GetCustomersHandlerTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetCustomersAsync_RejectsAnInvalidPageNumber_WithoutTouchingTheDb(int pageNumber)
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { PageNumber = pageNumber, PageSize = 10 };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task GetCustomersAsync_RejectsAnInvalidPageSize_WithoutTouchingTheDb(int pageSize)
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { PageNumber = 1, PageSize = pageSize };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersAsync_RejectsAnUndefinedSortColumn_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { SortColumn = (CustomerSortColumn)7 };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersAsync_RejectsAnUndefinedSortDirection_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { SortDirection = (SortDirection)7 };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetCustomersAsync_TreatsABlankSearchTermAsNoSearch(string? searchTerm)
    {
        var customers = new Mock<ICustomerRepository>();
        GetCustomersRequest? captured = null;
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((r, _) => captured = r)
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!"));
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { SearchTerm = searchTerm };

        await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Null(captured!.SearchTerm);
    }

    [Fact]
    public async Task GetCustomersAsync_RejectsASearchTermLongerThanTheProcParameter_WithoutTouchingTheDb()
    {
        var customers = new Mock<ICustomerRepository>();
        var handler = new GetCustomersHandler(customers.Object);
        var request = new GetCustomersRequest { SearchTerm = new string('a', 255) };

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersAsync_ReturnsWhateverTheDbLayerReturns()
    {
        var customers = new Mock<ICustomerRepository>();
        var expected = new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
            new PagedResponse<CustomerModel>([], 0, 1, 10));
        var request = new GetCustomersRequest { PageNumber = 1, PageSize = 10 };
        customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var handler = new GetCustomersHandler(customers.Object);

        var result = await handler.HandleAsync(request, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
