using System.Text.RegularExpressions;
using CustomerManagementSystem.BusinessLogic.Constants;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static partial class PhoneNumberValidation
{
    public static bool ValidatePhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrEmpty(phoneNumber)) return false;
        var regexMatch = PhoneNumberRegex().Match(phoneNumber);
        return regexMatch.Success;
    }

    [GeneratedRegex(RegexConstants.PhoneNumberRegex, RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex PhoneNumberRegex();
}