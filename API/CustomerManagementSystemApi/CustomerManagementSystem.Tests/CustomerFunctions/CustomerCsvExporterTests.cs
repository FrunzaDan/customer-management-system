using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerCsvExporterTests
{
    private static CustomerModel MakeCustomer(Func<CustomerModel, CustomerModel>? configure = null)
    {
        var customer = new CustomerModel
        {
            CustomerId = Guid.Parse("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
            FirstName = "Dan",
            LastName = "Frunza",
            Email = "dan@example.com",
            PhoneNumber = "123456789",
            Gender = Gender.Male,
            BirthDate = new DateOnly(1990, 1, 1),
            Status = CustomerStatus.Active,
            CreatedAt = new DateTime(2026, 1, 1, 8, 30, 0, DateTimeKind.Utc),
            LastInteractionAt = new DateTime(2026, 1, 2, 9, 45, 15, DateTimeKind.Utc),
            Address = new AddressModel
            {
                Country = "Romania",
                County = "Cluj",
                City = "Cluj-Napoca",
                PostalCode = "400001",
                Street = "Main",
                StreetNumber = "1"
            }
        };
        return configure is null ? customer : configure(customer);
    }

    [Fact]
    public void ToCsv_StartsWithAUtf8BomFollowedByTheHeaderRow()
    {
        var csv = CustomerCsvExporter.ToCsv([]);

        Assert.Equal((char)0xFEFF, csv[0]);
        Assert.StartsWith("Customer ID,First Name,Last Name,Email,Phone Number,Gender,Birth Date,Status,Created At,Last Interaction At,Country,County,City,Postal Code,Street,Street Number\r\n", csv[1..]);
    }

    [Fact]
    public void ToCsv_MapsGenderAndStatusCodesToLabels()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c =>
            c with { Gender = Gender.Female, Status = CustomerStatus.Deactivated })]);

        Assert.Contains(",female,", csv);
        Assert.Contains(",Deactivated,", csv);
    }

    [Fact]
    public void ToCsv_MapsTheTestStatusCodeToItsLabel()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c with { Status = CustomerStatus.Test })]);

        Assert.Contains(",Test,", csv);
    }

    [Fact]
    public void ToCsv_LeavesGenderBlankForAnUnrecognizedCode()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c with { Gender = (Gender)3 })]);

        var dataRow = csv.Split("\r\n")[1];
        Assert.Equal(string.Empty, dataRow.Split(',')[5]);
    }

    [Fact]
    public void ToCsv_WritesDatesAsIso8601_WithTimestampsMarkedUtc()
    {
        var dataRow = CustomerCsvExporter.ToCsv([MakeCustomer()]).Split("\r\n")[1].Split(',');

        Assert.Equal("1990-01-01", dataRow[6]);
        Assert.Equal("2026-01-01 08:30:00Z", dataRow[8]);
        Assert.Equal("2026-01-02 09:45:15Z", dataRow[9]);
    }

    [Fact]
    public void ToCsv_LeavesBirthdateBlank_WhenItIsNotSet()
    {
        var dataRow = CustomerCsvExporter.ToCsv([MakeCustomer(c => c with { BirthDate = null })]).Split("\r\n")[1];

        Assert.Equal(string.Empty, dataRow.Split(',')[6]);
    }

    [Fact]
    public void ToCsv_QuotesAndEscapesAFieldContainingACommaOrQuote()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c with { LastName = "Frunza, \"Dan\"" })]);

        Assert.Contains("\"Frunza, \"\"Dan\"\"\"", csv);
    }

    [Fact]
    public void ToCsv_PrefixesAFieldStartingWithAFormulaCharacterToPreventSpreadsheetInjection()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c with { LastName = "=cmd|'/c calc'!A0" })]);

        Assert.Contains(",'=cmd|'/c calc'!A0,", csv);
    }

    [Fact]
    public void ToCsv_WritesOneRowPerCustomer()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(), MakeCustomer()]);

        Assert.Equal(4, csv.Split("\r\n").Length);
    }
}
