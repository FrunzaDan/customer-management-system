using CustomerManagementSystem.BusinessLogic.Validations;

namespace CustomerManagementSystem.Tests.Validations;

public class PhoneNumberValidationTests
{
    [Theory]
    [InlineData("123456789")] // 9 digits, minimum accepted length
    [InlineData("123456789012")] // 12 digits, maximum accepted length
    public void ValidatePhoneNumber_AcceptsNumbersWithinAllowedLength(string phoneNumber)
    {
        Assert.True(PhoneNumberValidation.ValidatePhoneNumber(phoneNumber));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345678")] // 8 digits, too short
    [InlineData("1234567890123")] // 13 digits, too long
    [InlineData("+123456789")] // non-digit characters not allowed
    [InlineData("12345678a")]
    public void ValidatePhoneNumber_RejectsInvalidNumbers(string? phoneNumber)
    {
        Assert.False(PhoneNumberValidation.ValidatePhoneNumber(phoneNumber!));
    }
}
