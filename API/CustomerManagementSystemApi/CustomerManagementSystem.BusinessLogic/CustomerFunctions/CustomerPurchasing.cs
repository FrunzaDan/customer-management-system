using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerPurchasing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> PurchaseProductAsync(Guid customerId, Guid productId,
        string performedBy, CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "A valid customer ID is required.");

        if (productId == Guid.Empty)
            return new ResponseModel<object>(400, "A valid product ID is required.");

        var response = await dbUtils.PurchaseProductAsync(customerId, productId, cancellationToken);

        // Mutations carry no Data (see ai_docs/api.md): on success the DB layer hands back the
        // product's name purely so it can go into the audit entry, and it's dropped here.
        if (response.Status != 200)
            return new ResponseModel<object>(response.Status, response.ResponseMessage);

        // Not forwarding cancellationToken to the audit write: the purchase already
        // succeeded, so the log entry should still be attempted.
        await auditLogger.LogAsync(customerId, performedBy, AuditAction.Purchased,
            response.Data is { } productName ? $"Product: {productName}" : $"Product ID: {productId}");

        return new ResponseModel<object>(response.Status, response.ResponseMessage);
    }
}
