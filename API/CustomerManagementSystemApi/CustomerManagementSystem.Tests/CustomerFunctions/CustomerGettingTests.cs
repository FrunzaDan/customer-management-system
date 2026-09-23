using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerGettingTests
{
    private static readonly Guid CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6");
    private static readonly Guid ProductId = Guid.Parse("2432276c-4ef0-4e50-abc5-8b5f82297844");

    private static CustomerModel MakeCustomer() => new()
    {
        CustomerId = CustomerId,
        FirstName = "Dan",
        LastName = "Frunza",
        Email = "dan@example.com",
        PhoneNumber = "123456789",
        Gender = Gender.Male,
        Status = CustomerStatus.Active,
        CreatedAt = DateTime.UtcNow,
        LastInteractionAt = DateTime.UtcNow,
        Address = new AddressModel
        {
            Country = "Romania", County = "Cluj", City = "Cluj-Napoca", PostalCode = "400001", Street = "Main", StreetNumber = "1"
        }
    };

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetCustomerFunction_RejectsAnEmptySearchVariable_WithoutTouchingTheDb(string? searchTerm)
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomerFunction(searchTerm, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomer(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerFunction_RejectsASearchVariableThatIsNeitherIdPhoneNumberNorEmail()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomerFunction("not-a-valid-search-term", TestContext.Current.CancellationToken);

        Assert.Equal(404, result.Status);
        dbUtils.Verify(d => d.GetCustomer(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    // Every GUID spelling resolves to the same value — braces and case no longer matter,
    // since the key is compared as a UNIQUEIDENTIFIER, not as text.
    [InlineData("3fa85f64-5717-4562-b3fc-2c963f66afa6")]
    [InlineData("{3FA85F64-5717-4562-B3FC-2C963F66AFA6}")]
    [InlineData("3fa85f6457174562b3fc2c963f66afa6")]
    public async Task GetCustomerFunction_LooksUpByCustomerId_ForAnyGuidSpelling(string searchTerm)
    {
        var captured = await CaptureLookup(searchTerm);

        Assert.Equal(new CustomerLookup(CustomerId: CustomerId), captured);
    }

    [Fact]
    public async Task GetCustomerFunction_LooksUpByPhoneNumber_ForADigitsOnlySearchTerm()
    {
        Assert.Equal(new CustomerLookup(PhoneNumber: "123456789"), await CaptureLookup("123456789"));
    }

    [Fact]
    public async Task GetCustomerFunction_LooksUpByEmail_ForAnEmailShapedSearchVariable()
    {
        Assert.Equal(new CustomerLookup(Email: "dan@example.com"), await CaptureLookup(" dan@example.com "));
    }

    private static async Task<CustomerLookup?> CaptureLookup(string searchTerm)
    {
        var dbUtils = new Mock<IDbUtils>();
        CustomerLookup? captured = null;
        dbUtils.Setup(d => d.GetCustomer(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()))
            .Callback<CustomerLookup, CancellationToken>((l, _) => captured = l)
            .ReturnsAsync(new ResponseModel<CustomerModel>(200, "Customer found.", MakeCustomer()));
        var getting = new CustomerGetting(dbUtils.Object);

        await getting.GetCustomerFunction(searchTerm, TestContext.Current.CancellationToken);

        return captured;
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
    public async Task GetCustomersFunction_RejectsAnUndefinedSortColumn_WithoutTouchingTheDb()
    {
        // "?sortColumn=7" binds to (CustomerSortColumn)7 — the enum alone doesn't stop it.
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SortColumn = (CustomerSortColumn)7 };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersFunction_RejectsAnUndefinedSortDirection_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SortDirection = (SortDirection)7 };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
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
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!"));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SearchTerm = searchTerm };

        await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Null(captured!.SearchTerm);
    }

    [Fact]
    public async Task GetCustomersFunction_RejectsASearchTermLongerThanTheProcParameter_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new GetCustomersRequest { SearchTerm = new string('a', 255) };

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomersFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
            new PagedResponse<CustomerModel>([], 0, 1, 10));
        var request = new GetCustomersRequest { PageNumber = 1, PageSize = 10 };
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersFunction(request, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_RejectsAnUndefinedSortColumn_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new ExportCustomersRequest { SortColumn = (CustomerSortColumn)7 };

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
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
                new PagedResponse<CustomerModel>([], 0, 1, 5000)));
        var getting = new CustomerGetting(dbUtils.Object);
        var request = new ExportCustomersRequest
        {
            SearchTerm = " dan ", SortColumn = CustomerSortColumn.Email, SortDirection = SortDirection.Desc
        };

        await getting.GetCustomersForExportFunction(request, TestContext.Current.CancellationToken);

        Assert.Equal(1, captured!.PageNumber);
        Assert.Equal(5000, captured.PageSize);
        Assert.Equal("dan", captured.SearchTerm);
        Assert.Equal(CustomerSortColumn.Email, captured.SortColumn);
        Assert.Equal(SortDirection.Desc, captured.SortDirection);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_ReturnsCsvBuiltFromTheDbLayersPagedItems()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "Success!",
                new PagedResponse<CustomerModel>([MakeCustomer()], 1, 1, 5000)));
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersForExportFunction(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.Contains("Dan", result.Data);
        Assert.Contains("Frunza", result.Data);
    }

    [Fact]
    public async Task GetCustomersForExportFunction_PassesThroughADbLayerFailureUnchanged()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.GetCustomers(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(500, "Something went wrong."));
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomersForExportFunction(new ExportCustomersRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(500, result.Status);
        Assert.Equal("Something went wrong.", result.ResponseMessage);
        Assert.Null(result.Data);
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
    public async Task GetCustomerAuditLogFunction_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomerAuditLogFunction(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomerAuditLog(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerPurchasesFunction_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomerPurchasesFunction(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetCustomerPurchases(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetCustomerPurchasesFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<IReadOnlyList<PurchaseModel>>(200, "0 purchases found.", []);
        dbUtils.Setup(d => d.GetCustomerPurchases(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetCustomerPurchasesFunction(CustomerId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetCustomerPurchases(CustomerId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetProductDetailsFunction_RejectsAnEmptyCustomerId_WithoutTouchingTheDb()
    {
        var dbUtils = new Mock<IDbUtils>();
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetProductDetailsFunction(Guid.Empty, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetProductDetails(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetProductDetailsFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<ProductDetailsModel>(404, "Product not found.");
        dbUtils.Setup(d => d.GetProductDetails(ProductId, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetProductDetailsFunction(ProductId, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetProductDetails(ProductId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetProductsFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<IReadOnlyList<ProductModel>>(200, "0 products found.", []);
        dbUtils.Setup(d => d.GetProducts(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetProductsFunction(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }

    [Fact]
    public async Task GetAllAuditLogFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200, "Success!",
            new PagedResponse<GlobalAuditLogEntry>([], 0, 1, 10));
        dbUtils.Setup(d => d.GetAllCustomerAuditLog(1, 10, It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetAllAuditLogFunction(1, 10, TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
        dbUtils.Verify(d => d.GetAllCustomerAuditLog(1, 10, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMonthlyActivityFunction_ReturnsWhateverTheDbLayerReturns()
    {
        var dbUtils = new Mock<IDbUtils>();
        var expected = new ResponseModel<MonthlyActivityModel>(200, "Monthly activity retrieved.",
            new MonthlyActivityModel { CustomerRegistrations = [], ProductPurchases = [] });
        dbUtils.Setup(d => d.GetMonthlyActivity(It.IsAny<CancellationToken>())).ReturnsAsync(expected);
        var getting = new CustomerGetting(dbUtils.Object);

        var result = await getting.GetMonthlyActivityFunction(TestContext.Current.CancellationToken);

        Assert.Same(expected, result);
    }
}
