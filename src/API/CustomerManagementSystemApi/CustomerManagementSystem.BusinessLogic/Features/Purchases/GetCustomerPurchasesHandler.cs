using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Features.Purchases;

public class GetCustomerPurchasesHandler(IPurchaseRepository purchases)
{
    public async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> HandleAsync(Guid customerId,
        CancellationToken cancellationToken = default)
    {
        if (customerId == Guid.Empty)
            return new ResponseModel<IReadOnlyList<PurchaseModel>>(400, "A valid customer ID is required.");

        return await purchases.GetCustomerPurchasesAsync(customerId, cancellationToken);
    }
}
