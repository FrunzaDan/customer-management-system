namespace CustomerManagementSystem.BusinessLogic.Constants;

public static class RegexConstants
{
    // \z (not $) as the end anchor: unqualified $ also matches just before a trailing
    // \n, which would let e.g. "user@test.com\n" pass validation and get stored as-is.
    public const string GuidRegex = @"^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?\z";
    public const string MsisdnRegex = @"^[0-9]{9,12}\z";
    public const string EmailRegex = @"^\S+@\S+\.\S+\z";
}