using System.Data;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public class DbUtils(ISqlConnectionFactory connectionFactory) : IDbUtils
{
    public Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Create",
            command => DbHelper.AddCustomerParametersForCreate(command, customer),
            reader => DbHelper.HandleResponseWithCreatedGuidAsync(reader, "CustomerId"),
            cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomerAsync(CustomerLookup lookup,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Get",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", lookup.CustomerId);
                command.Parameters.AddVarChar("@PhoneNumber", FieldLengthConstants.PhoneNumber, lookup.PhoneNumber);
                command.Parameters.AddNVarChar("@Email", FieldLengthConstants.Email, lookup.Email);
            },
            DbHelper.HandleResponseWithCustomerAsync,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_List",
            command =>
            {
                command.Parameters.AddInt("@PageNumber", request.PageNumber);
                command.Parameters.AddInt("@PageSize", request.PageSize);
                command.Parameters.AddNVarChar("@SearchTerm", FieldLengthConstants.SearchTerm, request.SearchTerm);
                command.Parameters.AddVarChar("@SortColumn", FieldLengthConstants.SortColumn,
                    request.SortColumn.ToString().ToLowerInvariant());
                command.Parameters.AddVarChar("@SortDirection", FieldLengthConstants.SortDirection,
                    request.SortDirection.ToString().ToLowerInvariant());
            },
            reader => DbHelper.HandleResponseWithPagedCustomersAsync(reader, request.PageNumber, request.PageSize),
            cancellationToken);

    public Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Update",
            command => DbHelper.AddCustomerParametersForUpdate(command, customer),
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Deactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Reactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Delete",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public async Task<ResponseModel<MerchantRole?>> CheckMerchantCredentialsFromDbAsync(
        MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default)
    {
        var authData = await ExecuteStoredProcedureAsync(
            "dbo.Merchant_GetAuthData",
            command => command.Parameters.AddNVarChar("@Username", FieldLengthConstants.Username,
                merchantCredentials.Username),
            DbHelper.HandleMerchantAuthDataResponseAsync,
            cancellationToken
        );

        if (authData is null ||
            !PasswordHasher.VerifyPassword(merchantCredentials.Password ?? string.Empty, authData.PasswordHash,
                authData.PasswordSalt))
            return new ResponseModel<MerchantRole?>(401, "Invalid username or password.");

        var roleCode = (short)authData.MerchantRole;
        return authData.MerchantRole == MerchantRole.Merchant
            ? new ResponseModel<MerchantRole?>(200, $"Credentials validated successfully. Role: {roleCode}.",
                authData.MerchantRole)
            : new ResponseModel<MerchantRole?>(403, $"The provided merchant role ({roleCode}) is not valid.");
    }

    public Task<ResponseModel<object>> LogCustomerAuditAsync(Guid customerId, string performedBy, AuditAction action,
        string? details, CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_Create",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", customerId);
                command.Parameters.AddNVarChar("@PerformedBy", FieldLengthConstants.Username, performedBy);
                command.Parameters.AddVarChar("@ActionType", FieldLengthConstants.AuditAction, action.ToString());
                command.Parameters.AddNVarChar("@Details", FieldLengthConstants.AuditDetails, details);
            },
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLogAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithAuditLogListAsync,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLogAsync(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_List",
            command =>
            {
                command.Parameters.AddInt("@PageNumber", pageNumber);
                command.Parameters.AddInt("@PageSize", pageSize);
            },
            reader => DbHelper.HandleResponseWithPagedAuditLogListAsync(reader, pageNumber, pageSize),
            cancellationToken);

    public Task<ResponseModel<object>> DeleteAllCustomerAuditLogAsync(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_DeleteAll",
            null,
            DbHelper.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProductsAsync(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_List",
            null,
            DbHelper.HandleResponseWithProductListAsync,
            cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetailsAsync(Guid productId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_GetDetails",
            command => command.Parameters.AddGuid("@ProductId", productId),
            DbHelper.HandleResponseWithProductDetailsAsync,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchasesAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerPurchase_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithPurchaseListAsync,
            cancellationToken);

    public Task<ResponseModel<string>> PurchaseProductAsync(Guid customerId, Guid productId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerPurchase_Create",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", customerId);
                command.Parameters.AddGuid("@ProductId", productId);
            },
            DbHelper.HandleResponseWithPurchaseResultAsync,
            cancellationToken);

    public Task<ResponseModel<Guid?>> CreateProductAsync(CreateProductRequest product,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_Create",
            command => DbHelper.AddProductParametersForCreate(command, product),
            reader => DbHelper.HandleResponseWithCreatedGuidAsync(reader, "ProductId"),
            cancellationToken);

    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivityAsync(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Report_GetMonthlyActivity",
            null,
            DbHelper.HandleResponseWithMonthlyActivityAsync,
            cancellationToken);

    private async Task<T> ExecuteStoredProcedureAsync<T>(
        string storedProcedure,
        Action<SqlCommand>? configureCommand,
        Func<SqlDataReader, Task<T>> handleReader,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);

        await using var command = new SqlCommand(storedProcedure, connection);
        command.CommandType = CommandType.StoredProcedure;

        configureCommand?.Invoke(command);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
        return await handleReader(reader);
    }
}
