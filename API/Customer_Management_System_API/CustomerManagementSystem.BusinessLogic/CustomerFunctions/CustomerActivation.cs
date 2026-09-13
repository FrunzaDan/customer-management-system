using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerActivation(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeactivateCustomer(string guid, string merchantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(guid) || GuidValidation.ValidateGuid(guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.DeactivateCustomer(guid, cancellationToken);

        // Not forwarding cancellationToken to the audit write: the mutation already
        // succeeded, so the log entry should still be attempted regardless of whether
        // the client that triggered it is still connected.
        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, "Deactivated");

        return response;
    }

    public async Task<ResponseModel<object>> ReactivateCustomer(string guid, string merchantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(guid) || GuidValidation.ValidateGuid(guid) == false)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.ReactivateCustomer(guid, cancellationToken);

        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, "Reactivated");

        return response;
    }
}