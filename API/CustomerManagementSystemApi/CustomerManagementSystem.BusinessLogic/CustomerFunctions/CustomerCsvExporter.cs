using System.Globalization;
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
                customer.Guid.ToString(),
                customer.FirstName,
                customer.LastName,
                customer.Email,
                customer.Msisdn,
                GenderLabel(customer.Gender),
                customer.Birthdate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                StatusLabel(customer.CustomerStatus),
                // "u" = "yyyy-MM-dd HH:mm:ssZ": sortable, unambiguous, and explicitly UTC.
                customer.CreationDate.ToString("u", CultureInfo.InvariantCulture),
                customer.InteractionDate.ToString("u", CultureInfo.InvariantCulture),
                customer.Address.Country,
                customer.Address.County,
                customer.Address.Town,
                customer.Address.Zip,
                customer.Address.Street,
                customer.Address.Number
            };

            builder.AppendJoin(',', fields.Select(EscapeField)).Append("\r\n");
        }

        return builder.ToString();
    }

    private static string GenderLabel(Gender gender) => gender switch
    {
        Gender.NotDeclared => "not declared",
        Gender.Male => "male",
        Gender.Female => "female",
        _ => string.Empty
    };

    private static string StatusLabel(CustomerStatus status) => status switch
    {
        CustomerStatus.Active => "Active",
        CustomerStatus.Deactivated => "Deactivated",
        CustomerStatus.Test => "Test",
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
