using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public interface ICustomerAuditLogger
{
    Task LogAsync(Guid customerId, string performedBy, AuditAction action, string? details = null,
        CancellationToken cancellationToken = default);
}
