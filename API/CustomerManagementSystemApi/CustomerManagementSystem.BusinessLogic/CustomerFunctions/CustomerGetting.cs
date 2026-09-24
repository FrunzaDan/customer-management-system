using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerGetting(IDbUtils dbUtils)
{
    private const int MaxPageSize = 100;

    private const int MaxExportRows = 5000;

    public async Task<ResponseModel<CustomerModel>> GetCustomerAsync(string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return new ResponseModel<CustomerModel>(400, "Search variable cannot be null or empty.");

        var lookup = DetermineLookup(searchTerm.Trim());
        if (lookup is null)
            return new ResponseModel<CustomerModel>(400,
                "No valid search variable was provided! It must be a customer ID, phone number, or email.");

        return await dbUtils.GetCustomerAsync(lookup, cancellationToken);
    }

    public async Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.PageNumber < 1)
            return new ResponseModel<PagedResponse<CustomerModel>>(400, "Page number must be 1 or greater.");

        if (request.PageSize < 1 || request.PageSize > MaxPageSize)
            return new ResponseModel<PagedResponse<CustomerModel>>(400,
                $"Page size must be between 1 and {MaxPageSize}.");

        var validationError = ValidateAndNormalizeSortAndSearch(request);
        if (validationError != null)
            return new ResponseModel<PagedResponse<CustomerModel>>(400, validationError);

        return await dbUtils.GetCustomersAsync(request, cancellationToken);
    }

    public async Task<ResponseModel<string>> GetCustomersForExportAsync(ExportCustomersRequest request,
        CancellationToken cancellationToken = default)
    {
        var pagedRequest = new GetCustomersRequest
        {
            PageNumber = 1,
            PageSize = MaxExportRows,
            SearchTerm = request.SearchTerm,
            SortColumn = request.SortColumn,
            SortDirection = request.SortDirection
        };

        var validationError = ValidateAndNormalizeSortAndSearch(pagedRequest);
        if (validationError != null)
            return new ResponseModel<string>(400, validationError);

        var response = await dbUtils.GetCustomersAsync(pagedRequest, cancellationToken);
        if (response is not { Status: 200, Data: { } paged })
            return new ResponseModel<string>(response.Status, response.ResponseMessage);

        if (paged.TotalItems > MaxExportRows)
            return new ResponseModel<string>(400,
                $"{paged.TotalItems} customers match, but an export is limited to {MaxExportRows}. Narrow the search and try again.");

        var csv = CustomerCsvExporter.ToCsv(paged.Items);
        return new ResponseModel<string>(200, $"{paged.Items.Count} customers exported.", csv);
    }

    private static string? ValidateAndNormalizeSortAndSearch(GetCustomersRequest request)
    {
        if (!Enum.IsDefined(request.SortColumn))
            return $"Sort column must be one of: {string.Join(", ", Enum.GetNames<CustomerSortColumn>())}.";

        if (!Enum.IsDefined(request.SortDirection))
            return $"Sort direction must be one of: {string.Join(", ", Enum.GetNames<SortDirection>())}.";

        request.SearchTerm = string.IsNullOrWhiteSpace(request.SearchTerm) ? null : request.SearchTerm.Trim();

        if (request.SearchTerm?.Length > FieldLengthConstants.SearchTerm)
            return "Search term is too long.";

        return null;
    }

    public async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<IReadOnlyList<AuditLogEntry>>(400, "A valid customer ID is required.");

        return await dbUtils.GetCustomerAuditLogAsync(customerId, cancellationToken);
    }

    public async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<IReadOnlyList<PurchaseModel>>(400, "A valid customer ID is required.");

        return await dbUtils.GetCustomerPurchasesAsync(customerId, cancellationToken);
    }

    public async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400, "Page number must be 1 or greater.");

        if (pageSize < 1 || pageSize > MaxPageSize)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400,
                $"Page size must be between 1 and {MaxPageSize}.");

        return await dbUtils.GetAllCustomerAuditLogAsync(pageNumber, pageSize, cancellationToken);
    }

    public async Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityAsync(
        CancellationToken cancellationToken = default) =>
        await dbUtils.GetMonthlyActivityAsync(cancellationToken);

    private static CustomerLookup? DetermineLookup(string searchTerm)
    {
        if (Guid.TryParse(searchTerm, out var customerId))
            return new CustomerLookup(CustomerId: customerId);

        if (PhoneNumberValidation.ValidatePhoneNumber(searchTerm))
            return new CustomerLookup(PhoneNumber: searchTerm);

        if (EmailValidation.ValidateEmail(searchTerm) && searchTerm.Length <= FieldLengthConstants.Email)
            return new CustomerLookup(Email: searchTerm);

        return null;
    }
}
