using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.Repositories;

public class AuditLogRepository(StoredProcedureExecutor executor) : IAuditLogRepository
{
    public Task<ResponseModel<object>> LogCustomerAuditAsync(Guid customerId, string performedBy, AuditAction action,
        string? details, CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerAuditLog_Create",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", customerId);
                command.Parameters.AddNVarChar("@PerformedBy", FieldLengthConstants.Username, performedBy);
                command.Parameters.AddVarChar("@ActionType", FieldLengthConstants.AuditAction, action.ToString());
                command.Parameters.AddNVarChar("@Details", FieldLengthConstants.AuditDetails, details);
            },
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerAuditLog_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            HandleResponseWithAuditLogListAsync,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerAuditLog_List",
            command =>
            {
                command.Parameters.AddInt("@PageNumber", pageNumber);
                command.Parameters.AddInt("@PageSize", pageSize);
            },
            reader => HandleResponseWithPagedAuditLogListAsync(reader, pageNumber, pageSize),
            cancellationToken);

    public Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.CustomerAuditLog_DeleteAll",
            null,
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    private static async Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> HandleResponseWithAuditLogListAsync(
        SqlDataReader reader)
    {
        var items = new List<AuditLogEntry>();

        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapAuditLogEntryFromReader(reader));

        return new ResponseModel<IReadOnlyList<AuditLogEntry>>(200, $"{items.Count} audit log entries found.", items);
    }

    private static async Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> HandleResponseWithPagedAuditLogListAsync(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        await reader.ReadAsync().ConfigureAwait(false);
        var totalItems = reader.GetInt32("TotalCount");

        var items = new List<GlobalAuditLogEntry>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapGlobalAuditLogEntryFromReader(reader));

        return new ResponseModel<PagedResponse<GlobalAuditLogEntry>>(200,
            $"{items.Count} audit log entries found (page {pageNumber}).",
            new PagedResponse<GlobalAuditLogEntry>(items, totalItems, pageNumber, pageSize));
    }

    private static AuditLogEntry MapAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        CustomerAuditLogId = reader.GetInt32("CustomerAuditLogId"),
        CustomerId = reader.GetGuid("CustomerId"),
        PerformedBy = reader.GetString("PerformedBy"),
        ActionType = Enum.Parse<AuditAction>(reader.GetString("ActionType")),
        Details = reader.GetNullableString("Details"),
        OccurredAt = reader.GetUtcDateTime("OccurredAt")
    };

    private static GlobalAuditLogEntry MapGlobalAuditLogEntryFromReader(SqlDataReader reader) => new()
    {
        CustomerAuditLogId = reader.GetInt32("CustomerAuditLogId"),
        CustomerId = reader.GetGuid("CustomerId"),
        CustomerFirstName = reader.GetNullableString("FirstName"),
        CustomerLastName = reader.GetNullableString("LastName"),
        PerformedBy = reader.GetString("PerformedBy"),
        ActionType = Enum.Parse<AuditAction>(reader.GetString("ActionType")),
        Details = reader.GetNullableString("Details"),
        OccurredAt = reader.GetUtcDateTime("OccurredAt")
    };
}
