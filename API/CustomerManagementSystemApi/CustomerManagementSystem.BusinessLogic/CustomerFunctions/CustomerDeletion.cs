using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerDeletion(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await dbUtils.DeleteCustomerAsync(customerId, cancellationToken);

        // No FK from CustomerAuditLog to Customer, deliberately — this row
        // is the one place that outlives the customer it's about. Also not forwarding
        // cancellationToken here: the delete already succeeded, so the log entry should
        // still be attempted even if the client has since disconnected.
        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Deleted);

        return response;
    }

    // Mirrors GetAllCustomerAuditLogAsync living in CustomerGetting: grouped by verb, not
    // by entity, alongside the per-customer delete above. Not audit-logged itself —
    // there's no CustomerId to attach the entry to once the table is wiped.
    public async Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default) =>
        await dbUtils.DeleteAllCustomerAuditLogAsync(cancellationToken);
}