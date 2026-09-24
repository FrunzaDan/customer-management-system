using System.Data;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.DBConnection;

public class DbUtils(ISqlConnectionFactory connectionFactory) : IDbUtils
{
    public Task<ResponseModel<Guid?>> CreateCustomer(CreateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Create",
            command => DbHelper.AddCustomerParametersForCreate(command, customer),
            reader => DbHelper.HandleResponseWithCreatedGuid(reader, "CustomerId"),
            cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomer(CustomerLookup lookup,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Get",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", lookup.CustomerId);
                command.Parameters.AddVarChar("@PhoneNumber", FieldLengthConstants.PhoneNumber, lookup.PhoneNumber);
                command.Parameters.AddNVarChar("@Email", FieldLengthConstants.Email, lookup.Email);
            },
            DbHelper.HandleResponseWithCustomer,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomers(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_List",
            command =>
            {
                command.Parameters.AddInt("@PageNumber", request.PageNumber);
                command.Parameters.AddInt("@PageSize", request.PageSize);
                command.Parameters.AddNVarChar("@SearchTerm", FieldLengthConstants.SearchTerm, request.SearchTerm);
                // The proc's CASE-based ORDER BY matches on the lowercase names ('name', 'asc', ...).
                command.Parameters.AddVarChar("@SortColumn", FieldLengthConstants.SortColumn,
                    request.SortColumn.ToString().ToLowerInvariant());
                command.Parameters.AddVarChar("@SortDirection", FieldLengthConstants.SortDirection,
                    request.SortDirection.ToString().ToLowerInvariant());
            },
            reader => DbHelper.HandleResponseWithPagedCustomers(reader, request.PageNumber, request.PageSize),
            cancellationToken);

    public Task<ResponseModel<object>> UpdateCustomer(UpdateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Update",
            command => DbHelper.AddCustomerParametersForUpdate(command, customer),
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomer(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Deactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomer(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Reactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomer(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Customer_Delete",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public async Task<ResponseModel<MerchantRole?>> CheckMerchantCredentialsFromDb(
        MerchantCredentials merchantCredentials, CancellationToken cancellationToken = default)
    {
        var authData = await ExecuteStoredProcedureAsync(
            "dbo.Merchant_GetAuthData",
            command => command.Parameters.AddNVarChar("@Username", FieldLengthConstants.Username,
                merchantCredentials.Username),
            DbHelper.HandleMerchantAuthDataResponse,
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

    public Task<ResponseModel<object>> LogCustomerAudit(Guid customerId, string performedBy, AuditAction action,
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
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<AuditLogEntry>>> GetCustomerAuditLog(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithAuditLogList,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<GlobalAuditLogEntry>>> GetAllCustomerAuditLog(int pageNumber,
        int pageSize, CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_List",
            command =>
            {
                command.Parameters.AddInt("@PageNumber", pageNumber);
                command.Parameters.AddInt("@PageSize", pageSize);
            },
            reader => DbHelper.HandleResponseWithPagedAuditLogList(reader, pageNumber, pageSize),
            cancellationToken);

    public Task<ResponseModel<object>> DeleteAllCustomerAuditLog(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerAuditLog_DeleteAll",
            null,
            DbHelper.HandleResponseWithMessage,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<ProductModel>>> GetProducts(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_List",
            null,
            DbHelper.HandleResponseWithProductList,
            cancellationToken);

    public Task<ResponseModel<ProductDetailsModel>> GetProductDetails(Guid productId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_GetDetails",
            command => command.Parameters.AddGuid("@ProductId", productId),
            DbHelper.HandleResponseWithProductDetails,
            cancellationToken);

    public Task<ResponseModel<IReadOnlyList<PurchaseModel>>> GetCustomerPurchases(Guid customerId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerPurchase_ListByCustomer",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            DbHelper.HandleResponseWithPurchaseList,
            cancellationToken);

    public Task<ResponseModel<string>> PurchaseProduct(Guid customerId, Guid productId,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.CustomerPurchase_Create",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", customerId);
                command.Parameters.AddGuid("@ProductId", productId);
            },
            DbHelper.HandleResponseWithPurchaseResult,
            cancellationToken);

    public Task<ResponseModel<Guid?>> CreateProduct(CreateProductRequest product,
        CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Product_Create",
            command => DbHelper.AddProductParametersForCreate(command, product),
            reader => DbHelper.HandleResponseWithCreatedGuid(reader, "ProductId"),
            cancellationToken);

    public Task<ResponseModel<MonthlyActivityModel>> GetMonthlyActivity(CancellationToken cancellationToken = default) =>
        ExecuteStoredProcedureAsync(
            "dbo.Report_GetMonthlyActivity",
            null,
            DbHelper.HandleResponseWithMonthlyActivity,
            cancellationToken);

    private async Task<T> ExecuteStoredProcedureAsync<T>(
        string storedProcedure,
        Action<SqlCommand>? configureCommand,
        Func<SqlDataReader, Task<T>> handleReader,
        CancellationToken cancellationToken = default)
    {
        // No try/catch: expected outcomes come back as the proc's (Result, Message) row, and anything
        // thrown here (a SqlException the proc re-THROWs, a lost connection, a cancelled request)
        // propagates unchanged to GlobalExceptionHandler, which logs it once and answers 500.
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken).ConfigureAwait(false);

        await using var command = new SqlCommand(storedProcedure, connection);
        command.CommandType = CommandType.StoredProcedure;

        configureCommand?.Invoke(command);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
        return await handleReader(reader);
    }
}
