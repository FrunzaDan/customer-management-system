using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.AuditLog;

public interface ICustomerAuditLogger
{
    // Callers pass CancellationToken.None: the change is already saved, so its audit entry is written even if the request is cancelled.
    Task LogAsync(Guid customerId, string performedBy, AuditAction action, string? details = null,
        CancellationToken cancellationToken = default);
}
