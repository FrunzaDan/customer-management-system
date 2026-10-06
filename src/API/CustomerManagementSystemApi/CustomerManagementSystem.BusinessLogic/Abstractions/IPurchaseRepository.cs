using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Abstractions;

/// <summary>Purchase persistence. Implemented by DataAccess (stored procedures).</summary>
public interface IPurchaseRepository
{
    Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId, CancellationToken cancellationToken = default);

    /// <summary>On success, <see cref="ResponseModel{T}.Data"/> is the purchased product's name.</summary>
    Task<ResponseModel<string>> PurchaseProductAsync(Guid customerId, Guid productId, DateTime? purchasedAt, CancellationToken cancellationToken = default);
}
