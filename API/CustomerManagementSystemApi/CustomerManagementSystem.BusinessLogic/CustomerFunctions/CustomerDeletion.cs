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

        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Deleted);

        return response;
    }

    public async Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default) =>
        await dbUtils.DeleteAllCustomerAuditLogAsync(cancellationToken);
}