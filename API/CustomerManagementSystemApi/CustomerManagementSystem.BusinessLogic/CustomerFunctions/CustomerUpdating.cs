using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerUpdating(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest request, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (request.CustomerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        if (request.FirstName is not null && string.IsNullOrWhiteSpace(request.FirstName))
            return new ResponseModel<object>(400, "First name cannot be blank.");

        if (request.LastName is not null && string.IsNullOrWhiteSpace(request.LastName))
            return new ResponseModel<object>(400, "Last name cannot be blank.");

        if (!string.IsNullOrEmpty(request.FirstName) && request.FirstName.Length > FieldLengthConstants.FirstName)
            return new ResponseModel<object>(400, "First name is too long.");

        if (!string.IsNullOrEmpty(request.LastName) && request.LastName.Length > FieldLengthConstants.LastName)
            return new ResponseModel<object>(400, "Last name is too long.");

        if (request.Email is not null && EmailValidation.ValidateEmail(request.Email) == false)
            return new ResponseModel<object>(400, "Invalid Email.");
        if (request.Email is not null && request.Email.Length > FieldLengthConstants.Email)
            return new ResponseModel<object>(400, "Email is too long.");

        if (request.PhoneNumber is not null && PhoneNumberValidation.ValidatePhoneNumber(request.PhoneNumber) == false)
            return new ResponseModel<object>(400, "Invalid phone number.");

        if (request.Gender is { } gender && !Enum.IsDefined(gender))
            return new ResponseModel<object>(400, "Invalid Gender value.");

        if (request.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            return new ResponseModel<object>(400, "Birth date cannot be in the future.");

        if (request.Address is not null)
        {
            var addressError = AddressValidation.ValidateNotBlank(request.Address)
                               ?? AddressValidation.ValidateLengths(request.Address);
            if (addressError is not null)
                return new ResponseModel<object>(400, addressError);
        }

        var response = await dbUtils.UpdateCustomerAsync(request, cancellationToken);

        if (response.Status == 200)
            await auditLogger.LogAsync(request.CustomerId, performedBy, AuditAction.Edited, DescribeChangedFields(request));

        return response;
    }

    private static string DescribeChangedFields(UpdateCustomerRequest request)
    {
        var changedFields = new List<string>();

        if (request.FirstName is not null) changedFields.Add("first name");
        if (request.LastName is not null) changedFields.Add("last name");
        if (request.Email is not null) changedFields.Add("email");
        if (request.PhoneNumber is not null) changedFields.Add("phone number");
        if (request.Gender is not null) changedFields.Add("gender");
        if (request.BirthDate is not null) changedFields.Add("birth date");
        if (request.Address is not null) changedFields.Add("address");

        return changedFields.Count > 0 ? $"Updated: {string.Join(", ", changedFields)}" : "No fields changed";
    }
}
