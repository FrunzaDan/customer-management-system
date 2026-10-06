using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Abstractions;

/// <summary>How a single customer is looked up: exactly one of the three is set.</summary>
public sealed record CustomerLookup(Guid? CustomerId = null, string? PhoneNumber = null, string? Email = null);

/// <summary>Customer persistence. Implemented by DataAccess (stored procedures).</summary>
public interface ICustomerRepository
{
    Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest customer, CancellationToken cancellationToken = default);
    Task<ResponseModel<CustomerModel>> GetCustomerAsync(CustomerLookup lookup, CancellationToken cancellationToken = default);
    Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest customer, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<CustomerInsightsModel>> GetCustomerInsightsAsync(CancellationToken cancellationToken = default);
}
