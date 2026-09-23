using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerGetting
{
    private const int MaxPageSize = 100;

    // CSV export ignores paging (it's not a "current page" export) but still needs
    // a hard cap so an unfiltered export on a very large table can't balloon the
    // response — generous enough that no real local/demo dataset will ever hit it.
    private const int MaxExportRows = 5000;

    private static readonly string[] ValidSortColumns = ["name", "email", "msisdn"];
    private static readonly string[] ValidSortDirections = ["asc", "desc"];

    private readonly IDbUtils _dbUtils;

    public CustomerGetting(IDbUtils dbUtils)
    {
        _dbUtils = dbUtils;
    }

    public async Task<ResponseModel<object>> GetCustomerFunction(GetCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.SearchVariable))
            return new ResponseModel<object>(404, "Search variable is required.");

        request.SearchOption = DetermineSearchOption(request.SearchVariable);

        if (request.SearchOption == 0)
            return new ResponseModel<object>(404,
                "No valid search variable was provided! It must be a GUID, MSISDN, or Email.");

        return await _dbUtils.GetCustomer(request, cancellationToken);
    }

    public async Task<ResponseModel<object>> GetCustomersFunction(GetCustomersRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.PageNumber < 1)
            return new ResponseModel<object>(400, "Page number must be 1 or greater.");

        if (request.PageSize < 1 || request.PageSize > MaxPageSize)
            return new ResponseModel<object>(400, $"Page size must be between 1 and {MaxPageSize}.");

        var validationError = ValidateAndNormalizeSortAndSearch(request);
        if (validationError != null)
            return validationError;

        return await _dbUtils.GetCustomers(request, cancellationToken);
    }

    // Exports the full search/sort result (capped at MaxExportRows), not just one
    // page — it reuses usp_getCustomers via the same _dbUtils.GetCustomers call the
    // paginated endpoint uses, just with PageNumber/PageSize fixed internally, so the
    // filtering/sorting SQL stays in exactly one place.
    public async Task<ResponseModel<object>> GetCustomersForExportFunction(ExportCustomersRequest request,
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
            return validationError;

        var response = await _dbUtils.GetCustomers(pagedRequest, cancellationToken);
        if (response.Status != 200 || response.Data is not PagedResponse<CustomerModel> paged)
            return response;

        var csv = CustomerCsvExporter.ToCsv(paged.Items);
        return new ResponseModel<object>(200, $"{paged.Items.Count()} customers exported.", csv);
    }

    private static ResponseModel<object>? ValidateAndNormalizeSortAndSearch(GetCustomersRequest request)
    {
        var sortColumn = request.SortColumn.Trim().ToLowerInvariant();
        if (!ValidSortColumns.Contains(sortColumn))
            return new ResponseModel<object>(400,
                $"Sort column must be one of: {string.Join(", ", ValidSortColumns)}.");

        var sortDirection = request.SortDirection.Trim().ToLowerInvariant();
        if (!ValidSortDirections.Contains(sortDirection))
            return new ResponseModel<object>(400,
                $"Sort direction must be one of: {string.Join(", ", ValidSortDirections)}.");

        request.SortColumn = sortColumn;
        request.SortDirection = sortDirection;
        request.SearchTerm = string.IsNullOrWhiteSpace(request.SearchTerm) ? null : request.SearchTerm.Trim();

        return null;
    }

    public async Task<ResponseModel<object>> GetCustomerAuditLogFunction(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerGuid) || !GuidValidation.ValidateGuid(customerGuid))
            return new ResponseModel<object>(400, "A valid customer GUID is required.");

        return await _dbUtils.GetCustomerAuditLog(customerGuid, cancellationToken);
    }

    // Unpaginated on purpose: the catalogue is a fixed set of 50 products.
    public async Task<ResponseModel<object>> GetProductsFunction(CancellationToken cancellationToken = default) =>
        await _dbUtils.GetProducts(cancellationToken);

    public async Task<ResponseModel<object>> GetProductDetailsFunction(string productGuid,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(productGuid) || !GuidValidation.ValidateGuid(productGuid))
            return new ResponseModel<object>(400, "A valid product GUID is required.");

        return await _dbUtils.GetProductDetails(productGuid, cancellationToken);
    }

    public async Task<ResponseModel<object>> GetCustomerPurchasesFunction(string customerGuid,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(customerGuid) || !GuidValidation.ValidateGuid(customerGuid))
            return new ResponseModel<object>(400, "A valid customer GUID is required.");

        return await _dbUtils.GetCustomerPurchases(customerGuid, cancellationToken);
    }

    public async Task<ResponseModel<object>> GetAllAuditLogFunction(int pageNumber, int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
            return new ResponseModel<object>(400, "Page number must be 1 or greater.");

        if (pageSize < 1 || pageSize > MaxPageSize)
            return new ResponseModel<object>(400, $"Page size must be between 1 and {MaxPageSize}.");

        return await _dbUtils.GetAllCustomerAuditLog(pageNumber, pageSize, cancellationToken);
    }

    // Feeds the Charts tab's time-series charts. No paging/filtering — both series
    // are small (one row per month with any activity), same reasoning as GetProductsFunction.
    public async Task<ResponseModel<object>> GetMonthlyActivityFunction(CancellationToken cancellationToken = default) =>
        await _dbUtils.GetMonthlyActivity(cancellationToken);

    private static int DetermineSearchOption(string searchVariable)
    {
        return GuidValidation.ValidateGuid(searchVariable) ? 1 :
            MsisdnValidation.ValidateMsisdn(searchVariable) ? 2 :
            EmailValidation.ValidateEmail(searchVariable) ? 3 :
            0;
    }
}