using System.Text.RegularExpressions;
using CustomerManagementSystem.BusinessLogic.Constants;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static partial class MsisdnValidation
{
    public static bool ValidateMsisdn(string msisdn)
    {
        if (string.IsNullOrEmpty(msisdn)) return false;
        var regexMatch = MsisdnRegex().Match(msisdn);
        return regexMatch.Success;
    }

    [GeneratedRegex(RegexConstants.MsisdnRegex, RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex MsisdnRegex();
}