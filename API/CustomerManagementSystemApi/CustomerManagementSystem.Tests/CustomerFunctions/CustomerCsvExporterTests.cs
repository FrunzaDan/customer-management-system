using CustomerManagementSystem.BusinessLogic.CustomerFunctions;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.Tests.CustomerFunctions;

public class CustomerCsvExporterTests
{
    private static CustomerModel MakeCustomer(Action<CustomerModel>? configure = null)
    {
        var customer = new CustomerModel
        {
            Guid = "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            FirstName = "Dan",
            LastName = "Frunza",
            Email = "dan@example.com",
            Msisdn = "123456789",
            Gender = 1,
            Birthdate = "1990-01-01",
            CustomerStatus = 1901,
            CreationDate = "2026-01-01",
            InteractionDate = "2026-01-02",
            Address = new AddressModel
            {
                Country = "Romania",
                County = "Cluj",
                Town = "Cluj-Napoca",
                Zip = "400001",
                Street = "Main",
                Number = "1"
            }
        };
        configure?.Invoke(customer);
        return customer;
    }

    [Fact]
    public void ToCsv_StartsWithAUtf8BomFollowedByTheHeaderRow()
    {
        var csv = CustomerCsvExporter.ToCsv([]);

        Assert.Equal((char)0xFEFF, csv[0]);
        Assert.StartsWith("Guid,First Name,Last Name,Email,MSISDN,Gender,Birthdate,Status,Creation Date,Interaction Date,Country,County,Town,Zip,Street,Number\r\n", csv[1..]);
    }

    [Fact]
    public void ToCsv_MapsGenderAndStatusCodesToLabels()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c =>
        {
            c.Gender = 2;
            c.CustomerStatus = 1903;
        })]);

        Assert.Contains(",female,", csv);
        Assert.Contains(",Deactivated,", csv);
    }

    [Fact]
    public void ToCsv_MapsTheTestStatusCodeToItsLabel()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c.CustomerStatus = 1904)]);

        Assert.Contains(",Test,", csv);
    }

    [Theory]
    [InlineData(3)]
    [InlineData(null)]
    public void ToCsv_LeavesGenderBlankForAnUnrecognizedOrMissingCode(int? gender)
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c.Gender = gender)]);

        var dataRow = csv.Split("\r\n")[1];
        Assert.Equal(string.Empty, dataRow.Split(',')[5]);
    }

    [Fact]
    public void ToCsv_QuotesAndEscapesAFieldContainingACommaOrQuote()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c.LastName = "Frunza, \"Dan\"")]);

        Assert.Contains("\"Frunza, \"\"Dan\"\"\"", csv);
    }

    [Fact]
    public void ToCsv_PrefixesAFieldStartingWithAFormulaCharacterToPreventSpreadsheetInjection()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(c => c.LastName = "=cmd|'/c calc'!A0")]);

        Assert.Contains(",'=cmd|'/c calc'!A0,", csv);
    }

    [Fact]
    public void ToCsv_WritesOneRowPerCustomer()
    {
        var csv = CustomerCsvExporter.ToCsv([MakeCustomer(), MakeCustomer()]);

        // header + 2 data rows + trailing blank line from the last row's \r\n
        Assert.Equal(4, csv.Split("\r\n").Length);
    }
}
