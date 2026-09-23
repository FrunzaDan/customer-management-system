using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.Domain.Constants;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.Tests.Validations;

public class AddressValidationTests
{
    private static AddressRequest ValidAddress() => new()
    {
        Country = new string('a', FieldLengthConstants.Country),
        County = new string('a', FieldLengthConstants.County),
        City = new string('a', FieldLengthConstants.City),
        PostalCode = new string('a', FieldLengthConstants.PostalCode),
        Street = new string('a', FieldLengthConstants.Street),
        StreetNumber = new string('a', FieldLengthConstants.StreetNumber)
    };

    [Fact]
    public void ValidateLengths_ReturnsNull_WhenEveryFieldIsExactlyAtItsLimit()
    {
        Assert.Null(AddressValidation.ValidateLengths(ValidAddress()));
    }

    [Fact]
    public void ValidateLengths_ReturnsNull_WhenAllFieldsAreNull()
    {
        Assert.Null(AddressValidation.ValidateLengths(new AddressRequest()));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthCountry()
    {
        var address = ValidAddress();
        address.Country = new string('a', FieldLengthConstants.Country + 1);

        Assert.Equal("Country is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthCounty()
    {
        var address = ValidAddress();
        address.County = new string('a', FieldLengthConstants.County + 1);

        Assert.Equal("County is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthTown()
    {
        var address = ValidAddress();
        address.City = new string('a', FieldLengthConstants.City + 1);

        Assert.Equal("City is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthZip()
    {
        var address = ValidAddress();
        address.PostalCode = new string('a', FieldLengthConstants.PostalCode + 1);

        Assert.Equal("Postal code is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthStreet()
    {
        var address = ValidAddress();
        address.Street = new string('a', FieldLengthConstants.Street + 1);

        Assert.Equal("Street is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthNumber()
    {
        var address = ValidAddress();
        address.StreetNumber = new string('a', FieldLengthConstants.StreetNumber + 1);

        Assert.Equal("Street number is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateRequired_ReturnsNull_WhenEveryFieldIsPresent()
    {
        Assert.Null(AddressValidation.ValidateRequired(ValidAddress()));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ValidateRequired_RejectsAMissingPostalCode(string? postalCode)
    {
        var address = ValidAddress();
        address.PostalCode = postalCode;

        Assert.Equal("Postal code is required.", AddressValidation.ValidateRequired(address));
    }

    [Theory]
    [InlineData("400001")]
    [InlineData("SW1A 1AA")]
    [InlineData("12345-6789")]
    public void ValidateLengths_AcceptsRealWorldPostalCodes(string postalCode)
    {
        var address = ValidAddress();
        address.PostalCode = postalCode;

        Assert.Null(AddressValidation.ValidateLengths(address));
    }

    [Theory]
    [InlineData("4000é1")]
    [InlineData("400_001")]
    public void ValidateLengths_RejectsAPostalCodeThatWouldBeMangledByTheVarcharColumn(string postalCode)
    {
        var address = ValidAddress();
        address.PostalCode = postalCode;

        Assert.Equal("Postal code may only contain letters, digits, spaces and hyphens.",
            AddressValidation.ValidateLengths(address));
    }
}
