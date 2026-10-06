using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.AuditLog;

public class GetAllCustomerAuditLogHandler(IAuditLogRepository auditLog)
{
    public async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> HandleAsync(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default)
    {
        if (pageNumber < 1)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400, "Page number must be 1 or greater.");

        if (pageSize < 1 || pageSize > PagingConstants.MaxPageSize)
            return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(400,
                $"Page size must be between 1 and {PagingConstants.MaxPageSize}.");

        return await auditLog.GetAllCustomerAuditLogAsync(pageNumber, pageSize, cancellationToken);
    }
}
