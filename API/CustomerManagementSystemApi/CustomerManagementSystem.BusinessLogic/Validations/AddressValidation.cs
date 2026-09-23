using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static class AddressValidation
{
    // Registration only: every CustomerAddress column is NOT NULL, so a missing field would
    // otherwise surface as an opaque 500 from the insert instead of a validation error.
    // (Edit is a partial update — an omitted field there means "leave unchanged".)
    public static string? ValidateRequired(AddressRequest address)
    {
        if (string.IsNullOrWhiteSpace(address.Country)) return "Country is required.";
        if (string.IsNullOrWhiteSpace(address.County)) return "County is required.";
        if (string.IsNullOrWhiteSpace(address.Town)) return "Town is required.";
        if (string.IsNullOrWhiteSpace(address.Zip)) return "Zip is required.";
        if (string.IsNullOrWhiteSpace(address.Street)) return "Street is required.";
        if (string.IsNullOrWhiteSpace(address.Number)) return "Number is required.";
        return null;
    }

    // Returns an error message, or null if every present field is within its DB column's length.
    public static string? ValidateLengths(AddressRequest address)
    {
        if (address.Country?.Length > FieldLengthConstants.Country) return "Country is too long.";
        if (address.County?.Length > FieldLengthConstants.County) return "County is too long.";
        if (address.Town?.Length > FieldLengthConstants.Town) return "Town is too long.";
        if (address.Zip?.Length > FieldLengthConstants.Zip) return "Zip is too long.";
        if (address.Street?.Length > FieldLengthConstants.Street) return "Street is too long.";
        if (address.Number?.Length > FieldLengthConstants.Number) return "Number is too long.";
        return null;
    }
}
