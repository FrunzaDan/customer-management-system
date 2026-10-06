using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Logging;

namespace CustomerManagementSystem.BusinessLogic.Features.AuditLog;

public partial class CustomerAuditLogger(IAuditLogRepository auditLog, ILogger<CustomerAuditLogger> logger) : ICustomerAuditLogger
{
    public async Task LogAsync(Guid customerId, string performedBy, AuditAction action, string? details = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await auditLog.LogCustomerAuditAsync(customerId, performedBy, action, details, cancellationToken);
        }
        catch (Exception ex)
        {
            LogAuditWriteFailed(logger, ex, customerId, action);
        }
    }

    [LoggerMessage(EventId = 2, Level = LogLevel.Error,
        Message = "Failed to write audit log entry for customer {CustomerId}, action {Action}")]
    private static partial void LogAuditWriteFailed(ILogger logger, Exception exception, Guid customerId,
        AuditAction action);
}
