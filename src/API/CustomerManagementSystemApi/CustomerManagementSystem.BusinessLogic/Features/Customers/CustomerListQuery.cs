using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

/// <summary>The sort and search checks shared by the customer list and the CSV export.</summary>
internal static class CustomerListQuery
{
    // Returns an error message, or null after trimming the search term in place.
    public static string? ValidateAndNormalizeSortAndSearch(GetCustomersRequest request)
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
}
