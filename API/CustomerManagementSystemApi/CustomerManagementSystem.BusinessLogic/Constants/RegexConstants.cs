namespace CustomerManagementSystem.BusinessLogic.Constants;

public static class RegexConstants
{
    // \z (not $) as the end anchor: unqualified $ also matches just before a trailing
    // \n, which would let e.g. "user@test.com\n" pass validation and get stored as-is.
    public const string PhoneNumberRegex = @"^[0-9]{9,12}\z";
    public const string EmailRegex = @"^[^\s@]+@[^\s@]+\.[^\s@]+\z";
    public const string PostalCodeRegex = @"^[A-Za-z0-9 -]+\z";
}