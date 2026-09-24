namespace CustomerManagementSystem.BusinessLogic.Constants;

public static class RegexConstants
{
    public const string PhoneNumberRegex = @"^[0-9]{9,12}\z";
    public const string EmailRegex = @"^[^\s@]+@[^\s@]+\.[^\s@]+\z";
    public const string PostalCodeRegex = @"^[A-Za-z0-9 -]+\z";
}