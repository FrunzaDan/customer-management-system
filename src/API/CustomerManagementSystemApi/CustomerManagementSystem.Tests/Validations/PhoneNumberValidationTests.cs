using CustomerManagementSystem.BusinessLogic.Validations;

namespace CustomerManagementSystem.Tests.Validations;

public class PhoneNumberValidationTests
{
    [Theory]
    [InlineData("123456789")]
    [InlineData("123456789012")]
    public void ValidatePhoneNumber_AcceptsNumbersWithinAllowedLength(string phoneNumber)
    {
        Assert.True(PhoneNumberValidation.ValidatePhoneNumber(phoneNumber));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345678")]
    [InlineData("1234567890123")]
    [InlineData("+123456789")]
    [InlineData("12345678a")]
    public void ValidatePhoneNumber_RejectsInvalidNumbers(string? phoneNumber)
    {
        Assert.False(PhoneNumberValidation.ValidatePhoneNumber(phoneNumber!));
    }
}
