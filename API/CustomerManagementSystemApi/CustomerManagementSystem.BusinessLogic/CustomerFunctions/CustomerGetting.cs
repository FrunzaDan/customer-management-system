using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerGetting(IDbUtils dbUtils)
{
    private const int MaxPageSize = 100;

    // CSV export ignores paging (it's not a "current page" export) but still needs
    // a hard cap so an unfiltered export on a very large table can't balloon the
    // response — generous enough that no real local/demo dataset will ever hit it.
    private const int MaxExportRows = 5000;

    public async Task<ResponseModel<CustomerModel>> GetCustomerFunction(string? searchVariable,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(searchVariable))
            return new ResponseModel<CustomerModel>(400, "Search variable cannot be null or empty.");

        var lookup = DetermineLookup(searchVariable.Trim());
        if (lookup is null)
            return new ResponseModel<CustomerModel>(404,
                "No valid search variable was provided! It must be a GUID, MSISDN, or Email.");

        return await dbUtils.GetCustomer(lookup, cancellationToken);
    }

    public async Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersFunction(GetCustomersRequest request,
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

        return await dbUtils.GetCustomers(request, cancellationToken);
    }

    // Exports the full search/sort result (capped at MaxExportRows), not just one
    // page — it reuses Customer_List via the same dbUtils.GetCustomers call the
    // paginated endpoint uses, just with PageNumber/PageSize fixed internally, so the
    // filtering/sorting SQL stays in exactly one place.
    public async Task<ResponseModel<string>> GetCustomersForExportFunction(ExportCustomersRequest request,
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

        var response = await dbUtils.GetCustomers(pagedRequest, cancellationToken);
        if (response is not { Status: 200, Data: { } paged })
            return new ResponseModel<string>(response.Status, response.ResponseMessage);

        var csv = CustomerCsvExporter.ToCsv(paged.Items);
        return new ResponseModel<string>(200, $"{paged.Items.Count} customers exported.", csv);
    }

    // The enums can only hold an undefined value if one was forced in (e.g. "?sortColumn=7"
    // binds to (CustomerSortColumn)7), so this is a backstop, not the primary check.
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

    public async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogFunction(Guid customerGuid,
        CancellationToken cancellationToken = default)
    {
        if (customerGuid == Guid.Empty)
            return new ResponseModel<IReadOnlyList<AuditLogEntry>>(400, "A valid customer GUID is required.");

        return await dbUtils.GetCustomerAuditLog(customerGuid, cancellationToken);
    }

    // Unpaginated on purpose: the catalogue is a fixed set of 50 products.
    public async Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsFunction(
        CancellationToken cancellationToken = default) =>
        await dbUtils.GetProducts(cancellationToken);

    public async Task<ResponseModel<ProductDetailsModel>> GetProductDetailsFunction(Guid productGuid,
        CancellationToken cancellationToken = default)
    {
        if (productGuid == Guid.Empty)
            return new ResponseModel<ProductDetailsModel>(400, "A valid product GUID is required.");

        return await dbUtils.GetProductDetails(productGuid, cancellationToken);
    }

    public async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesFunction(Guid customerGuid,
        CancellationToken cancellationToken = default)
    {
        if (customerGuid == Guid.Empty)
            return new ResponseModel<IReadOnlyList<PurchaseModel>>(400, "A valid customer GUID is required.");

        return await dbUtils.GetCustomerPurchases(customerGuid, cancellationToken);
    }

    public async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllAuditLogFunction(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400, "Page number must be 1 or greater.");

        if (pageSize < 1 || pageSize > MaxPageSize)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400,
                $"Page size must be between 1 and {MaxPageSize}.");

        return await dbUtils.GetAllCustomerAuditLog(pageNumber, pageSize, cancellationToken);
    }

    // Feeds the Charts tab's time-series charts. No paging/filtering — both series
    // are small (one row per month with any activity), same reasoning as GetProductsFunction.
    public async Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityFunction(
        CancellationToken cancellationToken = default) =>
        await dbUtils.GetMonthlyActivity(cancellationToken);

    // Picks the one key Customer_Get should seek on, from the search term's shape: GUID
    // (any format Guid.TryParse accepts — braces, upper case, no hyphens), then MSISDN, then
    // email. Null when it's none of the three.
    private static CustomerLookup? DetermineLookup(string searchVariable)
    {
        if (Guid.TryParse(searchVariable, out var guid))
            return new CustomerLookup(Guid: guid);

        if (MsisdnValidation.ValidateMsisdn(searchVariable))
            return new CustomerLookup(Msisdn: searchVariable);

        if (EmailValidation.ValidateEmail(searchVariable) && searchVariable.Length <= FieldLengthConstants.Email)
            return new CustomerLookup(Email: searchVariable);

        return null;
    }
}
