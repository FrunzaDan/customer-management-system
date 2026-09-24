using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerActivation(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        // A malformed GUID never gets this far (model binding rejects it); Guid.Empty is what
        // a missing one binds to.
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await dbUtils.DeactivateCustomerAsync(customerId, cancellationToken);

        // Not forwarding cancellationToken to the audit write: the mutation already
        // succeeded, so the log entry should still be attempted regardless of whether
        // the client that triggered it is still connected.
        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Deactivated);

        return response;
    }

    public async Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await dbUtils.ReactivateCustomerAsync(customerId, cancellationToken);

        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Reactivated);

        return response;
    }
}
