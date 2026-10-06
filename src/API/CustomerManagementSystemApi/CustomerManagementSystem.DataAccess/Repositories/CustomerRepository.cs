using System.Globalization;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Data.SqlClient;

namespace CustomerManagementSystem.DataAccess.Repositories;

public class CustomerRepository(StoredProcedureExecutor executor) : ICustomerRepository
{
    public Task<ResponseModel<Guid?>> CreateCustomerAsync(CreateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Create",
            command => AddCustomerParametersForCreate(command, customer),
            reader => StoredProcedureResults.HandleResponseWithCreatedGuidAsync(reader, "CustomerId"),
            cancellationToken);

    public Task<ResponseModel<CustomerModel>> GetCustomerAsync(CustomerLookup lookup,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Get",
            command =>
            {
                command.Parameters.AddGuid("@CustomerId", lookup.CustomerId);
                command.Parameters.AddVarChar("@PhoneNumber", FieldLengthConstants.PhoneNumber, lookup.PhoneNumber);
                command.Parameters.AddNVarChar("@Email", FieldLengthConstants.Email, lookup.Email);
            },
            HandleResponseWithCustomerAsync,
            cancellationToken);

    public Task<ResponseModel<PagedResponse<CustomerModel>>> GetCustomersAsync(GetCustomersRequest request,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
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
            reader => HandleResponseWithPagedCustomersAsync(reader, request.PageNumber, request.PageSize),
            cancellationToken);

    public Task<ResponseModel<object>> UpdateCustomerAsync(UpdateCustomerRequest customer,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Update",
            command => AddCustomerParametersForUpdate(command, customer),
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> DeactivateCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Deactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> ReactivateCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Reactivate",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<object>> DeleteCustomerAsync(Guid customerId,
        CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Customer_Delete",
            command => command.Parameters.AddGuid("@CustomerId", customerId),
            StoredProcedureResults.HandleResponseWithMessageAsync,
            cancellationToken);

    public Task<ResponseModel<CustomerInsightsModel>> GetCustomerInsightsAsync(CancellationToken cancellationToken = default) =>
        executor.ExecuteAsync(
            "dbo.Report_GetCustomerInsights",
            null,
            HandleResponseWithCustomerInsightsAsync,
            cancellationToken);

    private static void AddCustomerParametersForCreate(SqlCommand command, CreateCustomerRequest customer)
    {
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.PhoneNumber,
            customer.Gender ?? Gender.NotDeclared, customer.BirthDate);
        command.Parameters.AddDate("@EnrollmentDate", customer.EnrollmentDate);
        command.Parameters.AddSmallInt("@StatusCode",
            (short)(customer.Status ?? CustomerStatus.Active));
        AddAddressParameters(command, customer.Address);
    }

    private static void AddCustomerParametersForUpdate(SqlCommand command, UpdateCustomerRequest customer)
    {
        command.Parameters.AddGuid("@CustomerId", customer.CustomerId);
        AddCustomerCoreParameters(command, customer.FirstName, customer.LastName, customer.Email, customer.PhoneNumber,
            customer.Gender, customer.BirthDate);
        command.Parameters.AddDate("@EnrollmentDate", customer.EnrollmentDate);
        AddAddressParameters(command, customer.Address);
    }

    private static void AddCustomerCoreParameters(SqlCommand command, string? firstName, string? lastName,
        string? email, string? phoneNumber, Gender? gender, DateOnly? birthDate)
    {
        command.Parameters.AddNVarChar("@FirstName", FieldLengthConstants.FirstName, firstName);
        command.Parameters.AddNVarChar("@LastName", FieldLengthConstants.LastName, lastName);
        command.Parameters.AddNVarChar("@Email", FieldLengthConstants.Email, email);
        command.Parameters.AddVarChar("@PhoneNumber", FieldLengthConstants.PhoneNumber, phoneNumber);
        command.Parameters.AddTinyInt("@Gender", (byte?)gender);
        command.Parameters.AddDate("@BirthDate", birthDate);
    }

    private static void AddAddressParameters(SqlCommand command, AddressRequest? address)
    {
        command.Parameters.AddNVarChar("@Country", FieldLengthConstants.Country, address?.Country);
        command.Parameters.AddNVarChar("@County", FieldLengthConstants.County, address?.County);
        command.Parameters.AddNVarChar("@City", FieldLengthConstants.City, address?.City);
        command.Parameters.AddNVarChar("@PostalCode", FieldLengthConstants.PostalCode, address?.PostalCode);
        command.Parameters.AddNVarChar("@Street", FieldLengthConstants.Street, address?.Street);
        command.Parameters.AddNVarChar("@StreetNumber", FieldLengthConstants.StreetNumber, address?.StreetNumber);
    }

    private static async Task<ResponseModel<CustomerModel>> HandleResponseWithCustomerAsync(SqlDataReader reader)
    {
        if (!await reader.ReadAsync().ConfigureAwait(false))
            return new ResponseModel<CustomerModel>(404, "Customer not found.");

        return new ResponseModel<CustomerModel>(200, "Customer found.", MapCustomerFromReader(reader));
    }

    private static async Task<ResponseModel<PagedResponse<CustomerModel>>> HandleResponseWithPagedCustomersAsync(
        SqlDataReader reader, int pageNumber, int pageSize)
    {
        await reader.ReadAsync().ConfigureAwait(false);
        var totalItems = reader.GetInt32("TotalCount");

        var items = new List<CustomerModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            items.Add(MapCustomerFromReader(reader));

        return new ResponseModel<PagedResponse<CustomerModel>>(200,
            $"{items.Count} customers found (page {pageNumber}).",
            new PagedResponse<CustomerModel>(items, totalItems, pageNumber, pageSize));
    }

    private static async Task<ResponseModel<CustomerInsightsModel>> HandleResponseWithCustomerInsightsAsync(
        SqlDataReader reader)
    {
        var customers = new List<CustomerProfileModel>();
        while (await reader.ReadAsync().ConfigureAwait(false))
            customers.Add(MapCustomerProfileFromReader(reader));

        var monthlySales = new List<MonthlySalesModel>();
        await reader.NextResultAsync().ConfigureAwait(false);
        while (await reader.ReadAsync().ConfigureAwait(false))
            monthlySales.Add(MapMonthlySalesFromReader(reader));

        return new ResponseModel<CustomerInsightsModel>(200, "Customer insights retrieved.",
            new CustomerInsightsModel { Customers = customers, MonthlySales = monthlySales });
    }

    private static CustomerModel MapCustomerFromReader(SqlDataReader reader) => new()
    {
        CustomerId = reader.GetGuid("CustomerId"),
        FirstName = reader.GetString("FirstName"),
        LastName = reader.GetString("LastName"),
        Email = reader.GetString("Email"),
        PhoneNumber = reader.GetString("PhoneNumber"),
        Gender = (Gender)reader.GetByte("Gender"),
        BirthDate = reader.GetNullableDateOnly("BirthDate"),
        Status = (CustomerStatus)reader.GetInt16("StatusCode"),
        EnrollmentDate = reader.GetDateOnly("EnrollmentDate"),
        AccountCreatedAt = reader.GetUtcDateTime("AccountCreatedAt"),
        LastInteractionAt = reader.GetUtcDateTime("LastInteractionAt"),
        Address = new AddressModel
        {
            Country = reader.GetString("Country"),
            County = reader.GetString("County"),
            City = reader.GetString("City"),
            PostalCode = reader.GetString("PostalCode"),
            Street = reader.GetString("Street"),
            StreetNumber = reader.GetString("StreetNumber")
        }
    };

    private static CustomerProfileModel MapCustomerProfileFromReader(SqlDataReader reader) => new()
    {
        Status = (CustomerStatus)reader.GetInt16("StatusCode"),
        Gender = (Gender)reader.GetByte("Gender"),
        BirthDate = reader.GetNullableDateOnly("BirthDate"),
        EnrollmentDate = reader.GetDateOnly("EnrollmentDate"),
        County = reader.GetString("County"),
        PurchaseCount = reader.GetInt32("PurchaseCount")
    };

    private static MonthlySalesModel MapMonthlySalesFromReader(SqlDataReader reader) => new()
    {
        YearMonth = reader.GetDateOnly("MonthStart").ToString("yyyy-MM", CultureInfo.InvariantCulture),
        PurchaseCount = reader.GetInt32("PurchaseCount"),
        Revenue = reader.GetDecimal("Revenue")
    };
}
