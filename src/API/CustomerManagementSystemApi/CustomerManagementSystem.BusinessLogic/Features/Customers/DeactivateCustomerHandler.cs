using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.AuditLog;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Customers;

public class DeactivateCustomerHandler(ICustomerRepository customers, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> HandleAsync(Guid customerId, string performedBy,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "Invalid or empty customer ID.");

        var response = await customers.DeactivateCustomerAsync(customerId, cancellationToken);

        if (response.Status == 200)
            await auditLogger.LogAsync(customerId, performedBy, AuditAction.Deactivated, cancellationToken: CancellationToken.None);

        return response;
    }
}
