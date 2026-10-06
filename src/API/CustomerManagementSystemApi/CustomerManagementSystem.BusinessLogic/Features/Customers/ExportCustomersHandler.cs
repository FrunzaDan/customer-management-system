using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

public class ExportCustomersHandler(ICustomerRepository customers)
{
    private const int MaxExportRows = 5000;

    public async Task<ResponseModel<string>> HandleAsync(ExportCustomersRequest request,
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

        var validationError = CustomerListQuery.ValidateAndNormalizeSortAndSearch(pagedRequest);
        if (validationError != null)
            return new ResponseModel<string>(400, validationError);

        var response = await customers.GetCustomersAsync(pagedRequest, cancellationToken);
        if (response is not { Status: 200, Data: { } paged })
            return new ResponseModel<string>(response.Status, response.ResponseMessage);

        if (paged.TotalItems > MaxExportRows)
            return new ResponseModel<string>(400,
                $"{paged.TotalItems} customers match, but an export is limited to {MaxExportRows}. Narrow the search and try again.");

        var csv = CustomerCsvExporter.ToCsv(paged.Items);
        return new ResponseModel<string>(200, $"{paged.Items.Count} customers exported.", csv);
    }
}
