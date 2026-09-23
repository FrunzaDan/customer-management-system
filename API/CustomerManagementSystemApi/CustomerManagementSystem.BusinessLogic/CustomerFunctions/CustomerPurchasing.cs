using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerPurchasing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> PurchaseProduct(Guid customerGuid, Guid productGuid,
        string merchantId, CancellationToken cancellationToken = default)
    {
        if (customerGuid == Guid.Empty)
            return new ResponseModel<object>(400, "A valid customer GUID is required.");

        if (productGuid == Guid.Empty)
            return new ResponseModel<object>(400, "A valid product GUID is required.");

        var response = await dbUtils.PurchaseProduct(customerGuid, productGuid, cancellationToken);

        // Mutations carry no Data (see ai_docs/api.md): on success the DB layer hands back the
        // product's name purely so it can go into the audit entry, and it's dropped here.
        if (response.Status != 200)
            return new ResponseModel<object>(response.Status, response.ResponseMessage);

        // Not forwarding cancellationToken to the audit write: the purchase already
        // succeeded, so the log entry should still be attempted.
        await auditLogger.Log(customerGuid, merchantId, AuditAction.Purchased,
            response.Data is { } productName ? $"Product: {productName}" : $"Product GUID: {productGuid}");

        return new ResponseModel<object>(response.Status, response.ResponseMessage);
    }
}
