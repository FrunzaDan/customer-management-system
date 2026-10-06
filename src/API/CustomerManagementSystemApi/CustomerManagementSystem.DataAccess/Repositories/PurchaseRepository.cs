using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.Repositories;

public class PurchaseRepository(StoredProcedureExecutor executor) : IPurchaseRepository
{
    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerPurchase_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            HandleResponseWithPurchaseListAsync,
            cancellationToken);

    public Task<ResponseModel<string>> PurchaseProductAsync(Guid customerId, Guid productId, DateTime? purchasedAt,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerPurchase_Create",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", customerId);
                command.Parameters.AddGuid("@ProductId", productId);
                command.Parameters.AddDateTime2("@PurchasedAt", purchasedAt);
            },
            HandleResponseWithPurchaseResultAsync,
            cancellationToken);

    private static async Task<ResponseModel<string>> HandleResponseWithPurchaseResultAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<string>(200, message ?? "Operation successful!",
                reader.GetNullableString("ProductName"))
            : new ResponseModel<string>(result, message ?? "Operation failed.");
    }

    private static async Task<ResponseModel<IReadOnlyList<PurchaseModel>>> HandleResponseWithPurchaseListAsync(
        SqlDataReader reader)
    {
        var items = new List<PurchaseModel>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapPurchaseFromReader(reader));

        return new ResponseModel<IReadOnlyList<PurchaseModel>>(200, $"{items.Count} purchases found.", items);
    }

    private static PurchaseModel MapPurchaseFromReader(SqlDataReader reader) => new()
    {
        CustomerPurchaseId = reader.GetInt32("CustomerPurchaseId"),
        CustomerId = reader.GetGuid("CustomerId"),
        ProductId = reader.GetGuid("ProductId"),
        ProductName = reader.GetString("ProductName"),
        Category = reader.GetString("Category"),
        Price = reader.GetDecimal("Price"),
        PurchasedAt = reader.GetUtcDateTime("PurchasedAt")
    };
}
