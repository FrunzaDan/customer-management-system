using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Logging;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

// Writing an audit entry is best-effort: it always runs after the customer
// mutation it's recording has already succeeded, so a DB hiccup while writing
// the log must never turn an otherwise-successful request into a 500 — it's
// swallowed and logged instead.
public class CustomerAuditLogger(IDbUtils dbUtils, ILogger<CustomerAuditLogger> logger) : ICustomerAuditLogger
{
    public async Task Log(Guid customerId, string performedBy, AuditAction action, string? details = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await dbUtils.LogCustomerAudit(customerId, performedBy, action, details, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Failed to write audit log entry for customer {CustomerId}, action {Action}",
                customerId, action);
        }
    }
}
