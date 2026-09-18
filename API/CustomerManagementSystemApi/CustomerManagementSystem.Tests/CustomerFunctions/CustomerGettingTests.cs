using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerGettingTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetCustomerFunction_RejectsAnEmptySearchVariable_WithoutTouchingTheDb(string? searchVariable)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomerRequest { SearchVariable = searchVariable };

        var result = await getting.GetCustomerFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(404, result.Status);
        dbUtils.Verify(d => d.GetCustomer(It.IsAny<GetCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerFunction_RejectsASearchVariableThatIsNeitherGuidMsisdnNorEmail()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomerRequest { SearchVariable = "not-a-valid-search-term" };

        var result = await getting.GetCustomerFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(404, result.Status);
        dbUtils.Verify(d => d.GetCustomer(It.IsAny<GetCustomerRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("3fa85f64-5717-4562-b3fc-2c963f66afa6", 1)] // GUID
    [InlineData("123456789", 2)] // MSISDN
    [InlineData("dan@example.com", 3)] // Email
    public async Task GetCustomerFunction_DetectsTheSearchOptionFromTheSearchVariableShape(string searchVariable, int expectedSearchOption)
    {
        var dbUtils = new Mock<IDbUtils>();
        GetCustomerRequest? capturedRequest = null;
        dbUtils.Setup(d => d.GetCustomer(It.IsAny<GetCustomerRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomerRequest, CancellationToken>((r, _) => capturedRequest = r)
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomerRequest { SearchVariable = searchVariable };

        await getting.GetCustomerFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(expectedSearchOption, capturedRequest!.SearchOption);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetCustomersFunction_RejectsAnInvalidPageNumber_WithoutTouchingTheDb(int pageNumber)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { PageNumber = pageNumber, PageSize = 10 };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task GetCustomersFunction_RejectsAnInvalidPageSize_WithoutTouchingTheDb(int pageSize)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { PageNumber = 1, PageSize = pageSize };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersFunction_RejectsAnInvalidSortColumn_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SortColumn = "not-a-real-column" };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersFunction_RejectsAnInvalidSortDirection_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SortDirection = "sideways" };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("NAME", "DESC", "name", "desc")]
    [InlineData(" Email ", " Asc ", "email", "asc")]
    public async Task GetCustomersFunction_NormalizesSortColumnAndDirectionToLowercase(
        string sortColumn, string sortDirection, string expectedColumn, string expectedDirection)
    {
        var dbUtils = new Mock<IDbUtils>();
        GetCustomersRequest? captured = null;
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((r, _) => captured = r)
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SortColumn = sortColumn, SortDirection = sortDirection };

        await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(expectedColumn, captured!.SortColumn);
        Assert.Equal(expectedDirection, captured.SortDirection);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetCustomersFunction_TreatsABlankSearchTermAsNoSearch(string? searchTerm)
    {
        var dbUtils = new Mock<IDbUtils>();
        GetCustomersRequest? captured = null;
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((r, _) => captured = r)
            .ReturnsAsync(new ResponseModel<object>(200, "Success!"));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SearchTerm = searchTerm };

        await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Null(captured!.SearchTerm);
    }

    [Fact]
    public async Task GetCustomersFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<object>(200, "Success!",
            new PagedResponse<CustomerModel>(new List<CustomerModel>(), 0, 1, 10));
        var request = new GetCustomersRequest { PageNumber = 1, PageSize = 10 };
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_RejectsAnInvalidSortColumn_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new ExportCustomersRequest { SortColumn = "not-a-real-column" };

        var result = await getting.GetCustomersForExportFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_RejectsAnInvalidSortDirection_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new ExportCustomersRequest { SortDirection = "sideways" };

        var result = await getting.GetCustomersForExportFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_IgnoresPagingAndRequestsTheFullCappedResultInOneCall()
    {
        var dbUtils = new Mock<IDbUtils>();
        GetCustomersRequest? captured = null;
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((r, _) => captured = r)
            .ReturnsAsync(new ResponseModel<object>(200, "Success!",
                new PagedResponse<CustomerModel>(new List<CustomerModel>(), 0, 1, 5000)));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new ExportCustomersRequest { SearchTerm = " dan ", SortColumn = " EMAIL ", SortDirection = " DESC " };

        await getting.GetCustomersForExportFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(1, captured!.PageNumber);
        Assert.Equal(5000, captured.PageSize);
        Assert.Equal("dan", captured.SearchTerm);
        Assert.Equal("email", captured.SortColumn);
        Assert.Equal("desc", captured.SortDirection);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_ReturnsCsvBuiltFromTheDbLayersPagedItems()
    {
        var dbUtils = new Mock<IDbUtils>();
        var customer = new CustomerModel { Guid = "g1", FirstName = "Dan", LastName = "Frunza" };
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(200, "Success!",
                new PagedResponse<CustomerModel>([customer], 1, 1, 5000)));
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersForExportFunction(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        var csv = Assert.IsType<string>(result.Data);
        Assert.Contains("Dan", csv);
        Assert.Contains("Frunza", csv);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_PassesThroughADbLayerFailureUnchanged()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<object>(500, "Something went wrong.");
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersForExportFunction(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetAllAuditLogFunction_RejectsAnInvalidPageNumber_WithoutTouchingTheDb(int pageNumber)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetAllAuditLogFunction(pageNumber, 10, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetAllCustomerAuditLog(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task GetAllAuditLogFunction_RejectsAnInvalidPageSize_WithoutTouchingTheDb(int pageSize)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetAllAuditLogFunction(1, pageSize, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetAllCustomerAuditLog(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAllAuditLogFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<object>(200, "Success!",
            new PagedResponse<GlobalAuditLogEntry>(new List<GlobalAuditLogEntry>(), 0, 1, 10));
        dbUtils.Setup(d => d.GetAllCustomerAuditLog(1, 10, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetAllAuditLogFunction(1, 10, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetAllCustomerAuditLog(1, 10, It.IsAny<CancellationToken>()), Times.Once);
    }
}
