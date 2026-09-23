using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerDeletion(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeleteCustomer(Guid guid, string merchantId,
        CancellationToken cancellationToken = default)
    {
        if (guid == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty Guid.");

        var response = await dbUtils.DeleteCustomer(guid, cancellationToken);

        // No FK from tbl_customer_audit_log to tbl_customers, deliberately — this row
        // is the one place that outlives the customer it's about. Also not forwarding
        // cancellationToken here: the delete already succeeded, so the log entry should
        // still be attempted even if the client has since disconnected.
        if (response.Status == 200)
            await auditLogger.Log(guid, merchantId, AuditAction.Deleted);

        return response;
    }

    // Mirrors GetAllAuditLogFunction living in CustomerGetting: grouped by verb, not
    // by entity, alongside the per-customer delete above. Not audit-logged itself —
    // there's no customer_guid to attach the entry to once the table is wiped.
    public async Task<ResponseModel<object>> DeleteAllAuditLogFunction(CancellationToken cancellationToken = default) =>
        await dbUtils.DeleteAllCustomerAuditLog(cancellationToken);
}