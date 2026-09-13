namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public interface ICustomerAuditLogger
{
    Task Log(string customerGuid, string merchantId, string action, string? details = null,
        CancellationToken cancellationToken = default);
}
