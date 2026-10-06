using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public class CustomerPurchasing(IDbUtils dbUtils, ICustomerAuditLogger auditLogger)
{
    // purchasedAt is in UTC; null means now. The database only accepts an
    // earlier date for a test customer, on or after their enrollment date.
    public async Task<ResponseModel<object>> PurchaseProductAsync(Guid customerId, Guid productId,
        DateTime? purchasedAt, string performedBy, CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<object>(400, "A valid customer ID is required.");

        if (productId == Guid.Empty)
            return new ResponseModel<object>(400, "A valid product ID is required.");

        if (purchasedAt > DateTime.UtcNow)
            return new ResponseModel<object>(400, "Purchase date cannot be in the future.");

        var response = await dbUtils.PurchaseProductAsync(customerId, productId, purchasedAt, cancellationToken);

        if (response.Status != 200)
            return new ResponseModel<object>(response.Status, response.ResponseMessage);

        await auditLogger.LogAsync(customerId, performedBy, AuditAction.Purchased,
            response.Data is { } productName ? $"Product: {productName}" : $"Product ID: {productId}", cancellationToken: CancellationToken.None);

        return new ResponseModel<object>(response.Status, response.ResponseMessage);
    }
}
