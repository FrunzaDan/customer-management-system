using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.AuditLog;

public class GetCustomerAuditLogHandler(IAuditLogRepository auditLog)
{
    public async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> HandleAsync(Guid customerId,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<IReadOnlyList<AuditLogEntry>>(400, "A valid customer ID is required.");

        return await auditLog.GetCustomerAuditLogAsync(customerId, cancellationToken);
    }
}
