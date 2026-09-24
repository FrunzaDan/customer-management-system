using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerCreation(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName))
            return new ResponseModel<Guid?>(400, "First name is required.");
        if (request.FirstName.Length > FieldLengthConstants.FirstName)
            return new ResponseModel<Guid?>(400, "First name is too long.");

        if (string.IsNullOrWhiteSpace(request.LastName))
            return new ResponseModel<Guid?>(400, "Last name is required.");
        if (request.LastName.Length > FieldLengthConstants.LastName)
            return new ResponseModel<Guid?>(400, "Last name is too long.");

        if (string.IsNullOrEmpty(request.Email) || EmailValidation.ValidateEmail(request.Email) == false)
            return new ResponseModel<Guid?>(400, "Invalid or empty Email.");
        if (request.Email.Length > FieldLengthConstants.Email)
            return new ResponseModel<Guid?>(400, "Email is too long.");

        if (string.IsNullOrEmpty(request.PhoneNumber) || PhoneNumberValidation.ValidatePhoneNumber(request.PhoneNumber) == false)
            return new ResponseModel<Guid?>(400, "Invalid or empty phone number.");

        if (request.Gender is { } gender && !Enum.IsDefined(gender))
            return new ResponseModel<Guid?>(400, "Invalid Gender value.");

        if (request.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            return new ResponseModel<Guid?>(400, "Birth date cannot be in the future.");

        if (request.Address is null)
            return new ResponseModel<Guid?>(400, "Address is required.");

        var addressError = AddressValidation.ValidateRequired(request.Address)
                           ?? AddressValidation.ValidateLengths(request.Address);
        if (addressError is not null)
            return new ResponseModel<Guid?>(400, addressError);

        if (request.Status is not null and not (CustomerStatus.Active or CustomerStatus.Test))
            return new ResponseModel<Guid?>(400, "Invalid customer status.");

        var response = await dbUtils.CreateCustomerAsync(request, cancellationToken);

        if (response is { Status: 200, Data: { } customerId })
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Created,
                $"Email: {request.Email}, Phone number: {request.PhoneNumber}");

        return response;
    }
}
