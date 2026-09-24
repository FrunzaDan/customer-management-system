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

        if (response.Status != 200)
            return new ResponseModel<object>(response.Status, response.ResponseMessage);

        await auditLogger.LogAsync(customerId, performedBy, AuditAction.Purchased,
            response.Data is { } productName ? $"Product: {productName}" : $"Product ID: {productId}");

        return new ResponseModel<object>(response.Status, response.ResponseMessage);
    }
}
