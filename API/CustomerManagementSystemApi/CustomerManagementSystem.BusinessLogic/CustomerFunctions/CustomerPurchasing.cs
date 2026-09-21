using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerPurchasing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    public async Task<ResponseModel<object>> PurchaseProduct(string customerGuid, string productGuid,
        string merchantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(customerGuid) || !GuidValidation.ValidateGuid(customerGuid))
            return new ResponseModel<object>(400, "A valid customer GUID is required.");

        if (string.IsNullOrEmpty(productGuid) || !GuidValidation.ValidateGuid(productGuid))
            return new ResponseModel<object>(400, "A valid product GUID is required.");

        var response = await dbUtils.PurchaseProduct(customerGuid, productGuid, cancellationToken);
        if (response.Status != 200)
            return response;

        // On success the DB layer hands back the product's name as Data, purely so it can go
        // into the audit entry. Not forwarding cancellationToken to the audit write: the
        // purchase already succeeded, so the log entry should still be attempted.
        await auditLogger.Log(customerGuid, merchantId, "Purchased",
            response.Data is string productName ? $"Product: {productName}" : $"Product GUID: {productGuid}");

        // Mutations carry no Data (see ai_docs/api.md) — the name was only for the audit entry.
        return new ResponseModel<object>(response.Status, response.ResponseMessage);
    }
}
