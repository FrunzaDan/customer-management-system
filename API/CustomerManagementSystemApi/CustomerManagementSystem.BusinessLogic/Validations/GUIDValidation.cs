using System.Text.RegularExpressions;
using CustomerManagementSystem.BusinessLogic.Constants;

namespace CustomerManagementSystem.BusinessLogic.Validations;

public static partial class GuidValidation
{
    public static bool ValidateGuid(string guid)
    {
        if (string.IsNullOrEmpty(guid)) return false;
        var regexMatch = GuidRegex().Match(guid);
        return regexMatch.Success;
    }

    [GeneratedRegex(RegexConstants.GuidRegex, RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex GuidRegex();
}