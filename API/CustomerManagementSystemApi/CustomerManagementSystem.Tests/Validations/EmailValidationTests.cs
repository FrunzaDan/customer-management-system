using CustomerManagementSystem.BusinessLogic.Validations;

namespace CustomerManagementSystem.Tests.Validations;

public class EmailValidationTests
{
    [Theory]
    [InlineData("test@example.com")]
    [InlineData("a@b.co")]
    [InlineData("first.last@sub.example.com")]
    public void ValidateEmail_AcceptsWellFormedAddresses(string email)
    {
        Assert.True(EmailValidation.ValidateEmail(email));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing-at-sign.com")]
    [InlineData("no-domain-dot@example")]
    [InlineData("has a space@example.com")]
    public void ValidateEmail_RejectsMalformedAddresses(string? email)
    {
        Assert.False(EmailValidation.ValidateEmail(email!));
    }
}
