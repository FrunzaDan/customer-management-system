using System.Text;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.CustomerFunctions;

public static class CustomerCsvExporter
{
    // UTF-8 BOM (U+FEFF), written via its code point rather than the invisible
    // literal glyph so it survives round-tripping through editors/encodings intact.
    private const char Utf8Bom = (char)0xFEFF;

    private static readonly string[] Header =
    [
        "Guid", "First Name", "Last Name", "Email", "MSISDN", "Gender", "Birthdate", "Status",
        "Creation Date", "Interaction Date", "Country", "County", "Town", "Zip", "Street", "Number"
    ];

    public static string ToCsv(IEnumerable<CustomerModel> customers)
    {
        var builder = new StringBuilder();
        // Leading BOM so Excel opens the file as UTF-8 instead of guessing ANSI
        // and mangling non-ASCII names/addresses.
        builder.Append(Utf8Bom);
        builder.AppendJoin(',', Header.Select(EscapeField)).Append("\r\n");

        foreach (var customer in customers)
        {
            var fields = new[]
            {
                customer.Guid,
                customer.FirstName,
                customer.LastName,
                customer.Email,
                customer.Msisdn,
                GenderLabel(customer.Gender),
                customer.Birthdate,
                StatusLabel(customer.CustomerStatus),
                customer.CreationDate,
                customer.InteractionDate,
                customer.Address?.Country,
                customer.Address?.County,
                customer.Address?.Town,
                customer.Address?.Zip,
                customer.Address?.Street,
                customer.Address?.Number
            };

            builder.AppendJoin(',', fields.Select(EscapeField)).Append("\r\n");
        }

        return builder.ToString();
    }

    private static string GenderLabel(int? gender) => gender switch
    {
        0 => "not declared",
        1 => "male",
        2 => "female",
        _ => string.Empty
    };

    // tbl_customers.customer_Status codes — see ai_docs/database.md.
    private static string StatusLabel(int? status) => status switch
    {
        1901 => "Active",
        1903 => "Deactivated",
        1904 => "Test",
        _ => string.Empty
    };

    // RFC 4180 quoting, plus a leading apostrophe on any field that starts with a
    // formula-trigger character (=, +, -, @) so a spreadsheet app never executes
    // customer-supplied data as a formula when the CSV is opened.
    private static string EscapeField(string? value)
    {
        var field = value ?? string.Empty;

        if (field.Length > 0 && (field[0] is '=' or '+' or '-' or '@'))
            field = "'" + field;

        if (field.Contains(',') || field.Contains('"') || field.Contains('\n') || field.Contains('\r'))
            field = "\"" + field.Replace("\"", "\"\"") + "\"";

        return field;
    }
}
