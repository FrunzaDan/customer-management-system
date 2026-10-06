using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

public class GetCustomerInsightsHandler(ICustomerRepository customers)
{
    public Task<ResponseModel<CustomerInsightsModel>> HandleAsync(CancellationToken cancellationToken = default) =>
        customers.GetCustomerInsightsAsync(cancellationToken);
}
