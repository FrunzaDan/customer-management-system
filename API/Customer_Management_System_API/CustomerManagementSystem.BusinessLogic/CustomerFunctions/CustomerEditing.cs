using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerEditing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> EditCustomerFunction(CustomerModel request, string merchantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(request.Guid) || GuidValidation.ValidateGuid(request.Guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        if (!string.IsNullOrEmpty(request.Email) && EmailValidation.ValidateEmail(request.Email) == false)
            return new ResponseModel<object>(400, "Invalid Email.");

        if (!string.IsNullOrEmpty(request.Msisdn) && MsisdnValidation.ValidateMsisdn(request.Msisdn) == false)
            return new ResponseModel<object>(400, "Invalid MSISDN.");

        var response = await dbUtils.EditCustomer(request, cancellationToken);

        // Not forwarding cancellationToken: the edit already succeeded, so the audit write
        // should still be attempted even if the client has since disconnected.
        if (response.Status == 200)
            await auditLogger.Log(request.Guid, merchantId, "Edited", DescribeChangedFields(request));

        return response;
    }

    // usp_editCustomer is a partial update (ISNULL(@param, column)) — only the fields
    // actually present in the request were touched, so list just those.
    private static string DescribeChangedFields(CustomerModel request)
    {
        var changedFields = new List<string>();

        if (!string.IsNullOrEmpty(request.FirstName)) changedFields.Add("first name");
        if (!string.IsNullOrEmpty(request.LastName)) changedFields.Add("last name");
        if (!string.IsNullOrEmpty(request.Email)) changedFields.Add("email");
        if (!string.IsNullOrEmpty(request.Msisdn)) changedFields.Add("MSISDN");
        if (request.Gender is not null) changedFields.Add("gender");
        if (!string.IsNullOrEmpty(request.Birthdate)) changedFields.Add("birthdate");
        if (request.Address is not null) changedFields.Add("address");

        return changedFields.Count > 0 ? $"Updated: {string.Join(", ", changedFields)}" : "No fields changed";
    }
}