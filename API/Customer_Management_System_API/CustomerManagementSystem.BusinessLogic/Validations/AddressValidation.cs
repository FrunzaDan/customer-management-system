using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static class AddressValidation
{
    // Returns an error message, or null if every present field is within its DB column's length.
    public static string? ValidateLengths(AddressModel address)
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
