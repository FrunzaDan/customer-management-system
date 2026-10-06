using CustomerManagementSystem.BusinessLogic.Contracts;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

/// <summary>Reads the (Result, Message[, Field]) row every mutating procedure ends with. Result 0 is success; anything else is the HTTP status.</summary>
public static class StoredProcedureResults
{
    public static async Task<ResponseModel<object>> HandleResponseWithMessageAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<object>(200, message ?? "Operation successful!")
            : new ResponseModel<object>(result, message ?? "Operation failed.", field: reader.GetOptionalString("Field"));
    }

    public static async Task<ResponseModel<Guid?>> HandleResponseWithCreatedGuidAsync(SqlDataReader reader,
        string guidColumn)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            throw new InvalidOperationException("The stored procedure returned no (Result, Message) row.");

        var result = reader.GetInt32("Result");
        var message = reader.GetNullableString("Message");
        return result == 0
            ? new ResponseModel<Guid?>(200, message ?? "Operation successful!", reader.GetNullableGuid(guidColumn))
            : new ResponseModel<Guid?>(result, message ?? "Operation failed.", field: reader.GetOptionalString("Field"));
    }
}
