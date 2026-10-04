using System.Text.RegularExpressions;
using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static partial class AddressValidation
{
    public static string? ValidateRequired(AddressRequest address)
    {
        if (string.IsNullOrWhiteSpace(address.Country)) return "Country is required.";
        if (string.IsNullOrWhiteSpace(address.County)) return "County is required.";
        if (string.IsNullOrWhiteSpace(address.City)) return "City is required.";
        if (string.IsNullOrWhiteSpace(address.PostalCode)) return "Postal code is required.";
        if (string.IsNullOrWhiteSpace(address.Street)) return "Street is required.";
        if (string.IsNullOrWhiteSpace(address.StreetNumber)) return "Street number is required.";
        return null;
    }

    public static string? ValidateNotBlank(AddressRequest address)
    {
        if (IsBlank(address.Country)) return "Country cannot be blank.";
        if (IsBlank(address.County)) return "County cannot be blank.";
        if (IsBlank(address.City)) return "City cannot be blank.";
        if (IsBlank(address.PostalCode)) return "Postal code cannot be blank.";
        if (IsBlank(address.Street)) return "Street cannot be blank.";
        if (IsBlank(address.StreetNumber)) return "Street number cannot be blank.";
        return null;
    }

    public static string? ValidateLengths(AddressRequest address)
    {
        if (address.Country?.Length > FieldLengthConstants.Country) return "Country is too long.";
        if (address.County?.Length > FieldLengthConstants.County) return "County is too long.";
        if (address.City?.Length > FieldLengthConstants.City) return "City is too long.";
        if (address.PostalCode?.Length > FieldLengthConstants.PostalCode) return "Postal code is too long.";
        if (!string.IsNullOrEmpty(address.PostalCode) && !PostalCodeRegex().IsMatch(address.PostalCode))
            return "Postal code may only contain letters, digits, spaces and hyphens.";
        if (address.Street?.Length > FieldLengthConstants.Street) return "Street is too long.";
        if (address.StreetNumber?.Length > FieldLengthConstants.StreetNumber) return "Street number is too long.";
        return null;
    }

    private static bool IsBlank(string? value) => value is not null && string.IsNullOrWhiteSpace(value);

    [GeneratedRegex(RegexConstants.PostalCodeRegex)]
    private static partial Regex PostalCodeRegex();
}
