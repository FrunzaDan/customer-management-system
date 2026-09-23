using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public interface ICustomerAuditLogger
{
    Task Log(Guid customerGuid, string merchantId, AuditAction action, string? details = null,
        CancellationToken cancellationToken = default);
}
