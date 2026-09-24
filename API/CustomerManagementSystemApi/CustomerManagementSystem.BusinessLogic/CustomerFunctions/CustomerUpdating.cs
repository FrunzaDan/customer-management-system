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

        if (!string.IsNullOrEmpty(request.FirstName) && request.FirstName.Length > FieldLengthConstants.FirstName)
            return new ResponseModel<object>(400, "First name is too long.");

        if (!string.IsNullOrEmpty(request.LastName) && request.LastName.Length > FieldLengthConstants.LastName)
            return new ResponseModel<object>(400, "Last name is too long.");

        if (!string.IsNullOrEmpty(request.Email) && EmailValidation.ValidateEmail(request.Email) == false)
            return new ResponseModel<object>(400, "Invalid Email.");
        if (!string.IsNullOrEmpty(request.Email) && request.Email.Length > FieldLengthConstants.Email)
            return new ResponseModel<object>(400, "Email is too long.");

        if (!string.IsNullOrEmpty(request.PhoneNumber) && PhoneNumberValidation.ValidatePhoneNumber(request.PhoneNumber) == false)
            return new ResponseModel<object>(400, "Invalid phone number.");

        // No BirthDate check: its format is guaranteed by the type (DateOnly) — a malformed
        // value is already rejected while the request body is deserialized.

        if (request.Gender is { } gender && !Enum.IsDefined(gender))
            return new ResponseModel<object>(400, "Invalid Gender value.");

        if (request.Address is not null)
        {
            var addressLengthError = AddressValidation.ValidateLengths(request.Address);
            if (addressLengthError is not null)
                return new ResponseModel<object>(400, addressLengthError);
        }

        var response = await dbUtils.UpdateCustomerAsync(request, cancellationToken);

        // Not forwarding cancellationToken: the edit already succeeded, so the audit write
        // should still be attempted even if the client has since disconnected.
        if (response.Status == 200)
            await auditLogger.LogAsync(request.CustomerId, performedBy, AuditAction.Edited, DescribeChangedFields(request));

        return response;
    }

    // Customer_Update is a partial update (ISNULL(@param, column)) — only the fields
    // actually present in the request were touched, so list just those.
    private static string DescribeChangedFields(UpdateCustomerRequest request)
    {
        var changedFields = new List<string>();

        if (!string.IsNullOrEmpty(request.FirstName)) changedFields.Add("first name");
        if (!string.IsNullOrEmpty(request.LastName)) changedFields.Add("last name");
        if (!string.IsNullOrEmpty(request.Email)) changedFields.Add("email");
        if (!string.IsNullOrEmpty(request.PhoneNumber)) changedFields.Add("phone number");
        if (request.Gender is not null) changedFields.Add("gender");
        if (request.BirthDate is not null) changedFields.Add("birth date");
        if (request.Address is not null) changedFields.Add("address");

        return changedFields.Count > 0 ? $"Updated: {string.Join(", ", changedFields)}" : "No fields changed";
    }
}
