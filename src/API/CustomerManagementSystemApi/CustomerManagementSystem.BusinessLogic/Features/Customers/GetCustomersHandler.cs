using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

public class GetCustomersHandler(ICustomerRepository customers)
{
    public async Task<ResponseModel<PagedResponse<CustomerModel>>> HandleAsync(GetCustomersRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.PageNumber < 1)
            return new ResponseModel<PagedResponse<CustomerModel>>(400, "Page number must be 1 or greater.");

        if (request.PageSize < 1 || request.PageSize > PagingConstants.MaxPageSize)
            return new ResponseModel<PagedResponse<CustomerModel>>(400,
                $"Page size must be between 1 and {PagingConstants.MaxPageSize}.");

        var validationError = CustomerListQuery.ValidateAndNormalizeSortAndSearch(request);
        if (validationError != null)
            return new ResponseModel<PagedResponse<CustomerModel>>(400, validationError);

        return await customers.GetCustomersAsync(request, cancellationToken);
    }
}
