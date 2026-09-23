using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerEditing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> EditCustomerFunction(UpdateCustomerRequest request, string merchantId,
        CancellationToken cancellationToken = default)
    {
        if (request.Guid == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        if (!string.IsNullOrEmpty(request.FirstName) && request.FirstName.Length > FieldLengthConstants.FirstName)
            return new ResponseModel<object>(400, "First name is too long.");

        if (!string.IsNullOrEmpty(request.LastName) && request.LastName.Length > FieldLengthConstants.LastName)
            return new ResponseModel<object>(400, "Last name is too long.");

        if (!string.IsNullOrEmpty(request.Email) && EmailValidation.ValidateEmail(request.Email) == false)
            return new ResponseModel<object>(400, "Invalid Email.");
        if (!string.IsNullOrEmpty(request.Email) && request.Email.Length > FieldLengthConstants.Email)
            return new ResponseModel<object>(400, "Email is too long.");

        if (!string.IsNullOrEmpty(request.Msisdn) && MsisdnValidation.ValidateMsisdn(request.Msisdn) == false)
            return new ResponseModel<object>(400, "Invalid MSISDN.");

        // No Birthdate check: its format is guaranteed by the type (DateOnly) — a malformed
        // value is already rejected while the request body is deserialized.

        if (request.Gender is { } gender && !Enum.IsDefined(gender))
            return new ResponseModel<object>(400, "Invalid Gender value.");

        if (request.Address is not null)
        {
            var addressLengthError = AddressValidation.ValidateLengths(request.Address);
            if (addressLengthError is not null)
                return new ResponseModel<object>(400, addressLengthError);
        }

        var response = await dbUtils.EditCustomer(request, cancellationToken);

        // Not forwarding cancellationToken: the edit already succeeded, so the audit write
        // should still be attempted even if the client has since disconnected.
        if (response.Status == 200)
            await auditLogger.Log(request.Guid, merchantId, AuditAction.Edited, DescribeChangedFields(request));

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
        if (!string.IsNullOrEmpty(request.Msisdn)) changedFields.Add("MSISDN");
        if (request.Gender is not null) changedFields.Add("gender");
        if (request.Birthdate is not null) changedFields.Add("birthdate");
        if (request.Address is not null) changedFields.Add("address");

        return changedFields.Count > 0 ? $"Updated: {string.Join(", ", changedFields)}" : "No fields changed";
    }
}
