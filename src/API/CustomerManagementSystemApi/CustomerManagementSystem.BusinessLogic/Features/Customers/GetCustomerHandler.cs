using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

public class GetCustomerHandler(ICustomerRepository customers)
{
    public async Task<ResponseModel<CustomerModel>> HandleAsync(string? searchTerm,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return new ResponseModel<CustomerModel>(400, "Search variable cannot be null or empty.");

        var lookup = DetermineLookup(searchTerm.Trim());
        if (lookup is null)
            return new ResponseModel<CustomerModel>(400,
                "No valid search variable was provided! It must be a customer ID, phone number, or email.");

        return await customers.GetCustomerAsync(lookup, cancellationToken);
    }

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
