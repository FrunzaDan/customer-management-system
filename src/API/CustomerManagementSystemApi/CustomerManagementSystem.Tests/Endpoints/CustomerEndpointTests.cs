using System.Net;
using System.Text.Json;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Endpoints;

// Each endpoint as the UI calls it: URL, HTTP method, parameters, the call that reaches the
// data layer, the response shape and the audit entry.
public class CustomerEndpointTests
{
    private static readonly Guid CustomerId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static ResponseModel<object> Ok() => new(200, "Done.");

    private static CustomerModel SampleCustomer() => new()
    {
        CustomerId = CustomerId,
        FirstName = "Ana",
        LastName = "Pop",
        PhoneNumber = "0712345678",
        Email = "ana@example.com",
        Status = CustomerStatus.Active,
        EnrollmentDate = new DateOnly(2024, 1, 2),
        AccountCreatedAt = new DateTime(2024, 1, 2, 8, 0, 0, DateTimeKind.Utc),
        LastInteractionAt = new DateTime(2024, 3, 4, 8, 0, 0, DateTimeKind.Utc),
        Gender = Gender.Female,
        BirthDate = new DateOnly(1990, 5, 6),
        Address = new AddressModel
        {
            Country = "Romania",
            County = "Cluj",
            City = "Cluj-Napoca",
            PostalCode = "400001",
            Street = "Main",
            StreetNumber = "1"
        },
    };

    [Fact]
    public async Task PostCreate_SendsTheBodyToTheDb_AndReturnsTheNewId()
    {
        await using var api = new ApiHost();
        CreateCustomerRequest? sent = null;
        api.Customers.Setup(d => d.CreateCustomerAsync(It.IsAny<CreateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .Callback<CreateCustomerRequest, CancellationToken>((request, _) => sent = request)
            .ReturnsAsync(new ResponseModel<Guid?>(200, "Customer created successfully.", CustomerId));

        var response = await api.PostAsync("/api/customer/create", new
        {
            firstName = "Ana",
            lastName = "Pop",
            email = "ana@example.com",
            phoneNumber = "0712345678",
            gender = 2,
            address = new
            {
                country = "Romania",
                county = "Cluj",
                city = "Cluj-Napoca",
                postalCode = "400001",
                street = "Main",
                streetNumber = "1"
            },
        });

        var envelope = await ApiHost.ReadEnvelopeAsync(response);
        Assert.Equal(CustomerId, envelope.GetProperty("data").GetGuid());
        Assert.NotNull(sent);
        Assert.Equal("Ana", sent.FirstName);
        Assert.Equal(Gender.Female, sent.Gender);
        Assert.Equal("Cluj-Napoca", sent.Address!.City);
        api.VerifyAudit(CustomerId, AuditAction.Created, "Email: ana@example.com, Phone number: 0712345678");
    }

    [Fact]
    public async Task GetGet_LooksTheCustomerUpById_AndReturnsItInTheWireFormat()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.GetCustomerAsync(new CustomerLookup(CustomerId, null, null), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<CustomerModel>(200, "Customer found.", SampleCustomer()));

        var response = await api.GetAsync($"/api/customer/get?searchTerm={CustomerId}");

        var customer = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data");
        Assert.Equal(CustomerId, customer.GetProperty("customerId").GetGuid());
        Assert.Equal("Ana", customer.GetProperty("firstName").GetString());
        Assert.Equal(1901, customer.GetProperty("status").GetInt32());
        Assert.Equal(2, customer.GetProperty("gender").GetInt32());
        Assert.Equal("2024-01-02", customer.GetProperty("enrollmentDate").GetString());
        Assert.Equal("1990-05-06", customer.GetProperty("birthDate").GetString());
        Assert.Equal("Cluj-Napoca", customer.GetProperty("address").GetProperty("city").GetString());
    }

    [Fact]
    public async Task GetGet_AnUnknownCustomer_IsA404Problem()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.GetCustomerAsync(It.IsAny<CustomerLookup>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<CustomerModel>(404, "Customer not found."));

        var response = await api.GetAsync("/api/customer/get?searchTerm=ana@example.com");

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal("Customer not found.", problem.GetProperty("detail").GetString());
        api.Customers.Verify(d => d.GetCustomerAsync(new CustomerLookup(null, null, "ana@example.com"),
            It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task GetAll_BindsTheUisQueryParameters_AndReturnsThePage()
    {
        await using var api = new ApiHost();
        GetCustomersRequest? sent = null;
        api.Customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GetCustomersRequest, CancellationToken>((request, _) => sent = request)
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "1 customers found (page 2).",
                new PagedResponse<CustomerModel>([SampleCustomer()], 51, 2, 50)));

        var response = await api.GetAsync(
            "/api/customer/all?pageNumber=2&pageSize=50&sortColumn=email&sortDirection=desc&searchTerm=%20ana%20");

        var page = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data");
        Assert.Equal(51, page.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, page.GetProperty("pageNumber").GetInt32());
        Assert.Equal(50, page.GetProperty("pageSize").GetInt32());
        Assert.Equal("Ana", page.GetProperty("items")[0].GetProperty("firstName").GetString());
        Assert.NotNull(sent);
        Assert.Equal(2, sent.PageNumber);
        Assert.Equal(50, sent.PageSize);
        Assert.Equal(CustomerSortColumn.Email, sent.SortColumn);
        Assert.Equal(SortDirection.Desc, sent.SortDirection);
        Assert.Equal("ana", sent.SearchTerm);
    }

    [Fact]
    public async Task GetAll_ATooLargePage_IsA400Problem_WithoutTouchingTheDb()
    {
        await using var api = new ApiHost();

        var response = await api.GetAsync("/api/customer/all?pageNumber=1&pageSize=101");

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Page size must be between 1 and 100.", problem.GetProperty("detail").GetString());
        api.Customers.Verify(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetExport_ReturnsACsvFile()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.GetCustomersAsync(It.IsAny<GetCustomersRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<CustomerModel>>(200, "",
                new PagedResponse<CustomerModel>([SampleCustomer()], 1, 1, 5000)));

        var response = await api.GetAsync("/api/customer/export?sortColumn=name&sortDirection=asc");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Matches(@"^customers_\d{8}_\d{6}\.csv$", response.Content.Headers.ContentDisposition?.FileName);
        var csv = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("Customer ID,First Name,Last Name", csv);
        Assert.Contains("ana@example.com", csv);
    }

    [Fact]
    public async Task PatchUpdate_SendsOnlyTheGivenFields_AndAuditsWhatChanged()
    {
        await using var api = new ApiHost();
        UpdateCustomerRequest? sent = null;
        api.Customers.Setup(d => d.UpdateCustomerAsync(It.IsAny<UpdateCustomerRequest>(), It.IsAny<CancellationToken>()))
            .Callback<UpdateCustomerRequest, CancellationToken>((request, _) => sent = request)
            .ReturnsAsync(Ok());

        var response = await api.PatchAsync("/api/customer/update", new { customerId = CustomerId, firstName = "Ioana" });

        await ApiHost.ReadEnvelopeAsync(response);
        Assert.NotNull(sent);
        Assert.Equal(CustomerId, sent.CustomerId);
        Assert.Equal("Ioana", sent.FirstName);
        Assert.Null(sent.LastName);
        Assert.Null(sent.Address);
        api.VerifyAudit(CustomerId, AuditAction.Edited, "Updated: first name");
    }

    [Fact]
    public async Task PatchDeactivate_DeactivatesThatCustomer_AndAuditsIt()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.DeactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(Ok());

        var response = await api.PatchAsync($"/api/customer/deactivate?customerId={CustomerId}");

        await ApiHost.ReadEnvelopeAsync(response);
        api.Customers.Verify(d => d.ReactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        api.VerifyAudit(CustomerId, AuditAction.Deactivated);
    }

    [Fact]
    public async Task PatchReactivate_ReactivatesThatCustomer_AndAuditsIt()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.ReactivateCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(Ok());

        var response = await api.PatchAsync($"/api/customer/reactivate?customerId={CustomerId}");

        await ApiHost.ReadEnvelopeAsync(response);
        api.Customers.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        api.VerifyAudit(CustomerId, AuditAction.Reactivated);
    }

    [Fact]
    public async Task PatchDeactivate_WithoutACustomerId_IsA400Problem_WithoutTouchingTheDb()
    {
        await using var api = new ApiHost();

        var response = await api.PatchAsync("/api/customer/deactivate");

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal("Invalid or empty customer ID.", problem.GetProperty("detail").GetString());
        api.Customers.Verify(d => d.DeactivateCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteDelete_DeletesThatCustomer_AndAuditsIt()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.DeleteCustomerAsync(CustomerId, It.IsAny<CancellationToken>())).ReturnsAsync(Ok());

        var response = await api.DeleteAsync($"/api/customer/delete?customerId={CustomerId}");

        await ApiHost.ReadEnvelopeAsync(response);
        api.VerifyAudit(CustomerId, AuditAction.Deleted);
    }

    [Fact]
    public async Task DeleteDelete_AStateConflictFromTheDb_IsA409Problem_AndNotAudited()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.DeleteCustomerAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<object>(409, "Only a deactivated customer can be deleted."));

        var response = await api.DeleteAsync($"/api/customer/delete?customerId={CustomerId}");

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal("Only a deactivated customer can be deleted.", problem.GetProperty("detail").GetString());
        api.AuditLog.Verify(d => d.LogCustomerAuditAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<AuditAction>(),
            It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetAuditLog_ReturnsTheCustomersEntries_WithTheActionAsText()
    {
        await using var api = new ApiHost();
        api.AuditLog.Setup(d => d.GetCustomerAuditLogAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<IReadOnlyList<AuditLogEntry>>(200, "", [
                new AuditLogEntry
                {
                    CustomerAuditLogId = 7, CustomerId = CustomerId, PerformedBy = ApiHost.Username,
                    ActionType = AuditAction.Deactivated, OccurredAt = DateTime.UtcNow
                }
            ]));

        var response = await api.GetAsync($"/api/customer/audit-log?customerId={CustomerId}");

        var entry = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data")[0];
        Assert.Equal(7, entry.GetProperty("customerAuditLogId").GetInt32());
        Assert.Equal("Deactivated", entry.GetProperty("actionType").GetString());
        Assert.Equal(JsonValueKind.Null, entry.GetProperty("details").ValueKind);
    }

    [Fact]
    public async Task GetAllAuditLog_PassesThePage_AndReturnsIt()
    {
        await using var api = new ApiHost();
        api.AuditLog.Setup(d => d.GetAllCustomerAuditLogAsync(3, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200, "",
                new PagedResponse<GlobalAuditLogEntry>([], 41, 3, 20)));

        var response = await api.GetAsync("/api/customer/audit-log/all?pageNumber=3");

        var page = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data");
        Assert.Equal(41, page.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, page.GetProperty("pageNumber").GetInt32());
    }

    [Fact]
    public async Task DeleteAllAuditLog_ClearsTheLog()
    {
        await using var api = new ApiHost();
        api.AuditLog.Setup(d => d.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Ok());

        var response = await api.DeleteAsync("/api/customer/audit-log/all");

        await ApiHost.ReadEnvelopeAsync(response);
        api.AuditLog.Verify(d => d.DeleteAllCustomerAuditLogAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetInsights_ReturnsTheProfilesAndMonthlySales()
    {
        await using var api = new ApiHost();
        api.Customers.Setup(d => d.GetCustomerInsightsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<CustomerInsightsModel>(200, "", new CustomerInsightsModel
            {
                Customers = [],
                MonthlySales = [new MonthlySalesModel { YearMonth = "2026-09", PurchaseCount = 3, Revenue = 12.5m }],
            }));

        var response = await api.GetAsync("/api/customer/insights");

        var sales = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data").GetProperty("monthlySales")[0];
        Assert.Equal("2026-09", sales.GetProperty("yearMonth").GetString());
        Assert.Equal(12.5m, sales.GetProperty("revenue").GetDecimal());
    }

    [Fact]
    public async Task GetPurchases_ReturnsTheCustomersPurchases()
    {
        await using var api = new ApiHost();
        api.Purchases.Setup(d => d.GetCustomerPurchasesAsync(CustomerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<IReadOnlyList<PurchaseModel>>(200, "", [
                new PurchaseModel
                {
                    CustomerPurchaseId = 1, CustomerId = CustomerId, ProductId = ProductId, ProductName = "Latte",
                    Category = "Coffee", Price = 14.5m, PurchasedAt = DateTime.UtcNow
                }
            ]));

        var response = await api.GetAsync($"/api/customer/purchases?customerId={CustomerId}");

        var purchase = (await ApiHost.ReadEnvelopeAsync(response)).GetProperty("data")[0];
        Assert.Equal("Latte", purchase.GetProperty("productName").GetString());
        Assert.Equal(14.5m, purchase.GetProperty("price").GetDecimal());
    }

    [Fact]
    public async Task PostPurchase_SendsThePurchaseTimeInUtc_AndAuditsTheProductName()
    {
        await using var api = new ApiHost();
        api.Purchases.Setup(d => d.PurchaseProductAsync(CustomerId, ProductId, It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<string>(200, "Purchase completed.", "Latte"));

        var response = await api.PostAsync(
            $"/api/customer/purchase?customerId={CustomerId}&productId={ProductId}&purchasedAt=2026-01-01T10:00:00%2B02:00");

        await ApiHost.ReadEnvelopeAsync(response);
        api.Purchases.Verify(d => d.PurchaseProductAsync(CustomerId, ProductId,
            new DateTime(2026, 1, 1, 8, 0, 0, DateTimeKind.Utc), It.IsAny<CancellationToken>()));
        api.VerifyAudit(CustomerId, AuditAction.Purchased, "Product: Latte");
    }
}
