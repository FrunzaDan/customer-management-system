using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerActivation(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await dbUtils.DeactivateCustomerAsync(customerId, cancellationToken);

        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Deactivated, cancellationToken: CancellationToken.None);

        return response;
    }

    public async Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await dbUtils.ReactivateCustomerAsync(customerId, cancellationToken);

        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Reactivated, cancellationToken: CancellationToken.None);

        return response;
    }
}
