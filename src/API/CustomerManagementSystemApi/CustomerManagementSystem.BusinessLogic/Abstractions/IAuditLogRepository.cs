using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Abstractions;

/// <summary>Customer audit log persistence. Implemented by DataAccess (stored procedures).</summary>
public interface IAuditLogRepository
{
    Task<ResponseModel<object>> LogCustomerAuditAsync(Guid customerId, string performedBy, AuditAction action, string? details, CancellationToken cancellationToken = default);
    Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default);
}
