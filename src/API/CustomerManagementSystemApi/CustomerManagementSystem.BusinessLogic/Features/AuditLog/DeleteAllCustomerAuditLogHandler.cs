using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;

namespace CustomerManagementSystem.BusinessLogic.Features.AuditLog;

public class DeleteAllCustomerAuditLogHandler(IAuditLogRepository auditLog)
{
    public Task<ResponseModel<object>> HandleAsync(CancellationToken cancellationToken = default) =>
        auditLog.DeleteAllCustomerAuditLogAsync(cancellationToken);
}
