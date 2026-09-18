using CustomerManagementSystem.BusinessLogic.Constants;
using CustomerManagementSystem.BusinessLogic.Validations;
using CustomerManagementSystem.Domain.Models;

namespace CustomerManagementSystem.Tests.Validations;

public class AddressValidationTests
{
    private static AddressModel ValidAddress() => new()
    {
        Country = new string('a', FieldLengthConstants.Country),
        County = new string('a', FieldLengthConstants.County),
        Town = new string('a', FieldLengthConstants.Town),
        Zip = new string('a', FieldLengthConstants.Zip),
        Street = new string('a', FieldLengthConstants.Street),
        Number = new string('a', FieldLengthConstants.Number)
    };

    [Fact]
    public void ValidateLengths_ReturnsNull_WhenEveryFieldIsExactlyAtItsLimit()
    {
        Assert.Null(AddressValidation.ValidateLengths(ValidAddress()));
    }

    [Fact]
    public void ValidateLengths_ReturnsNull_WhenAllFieldsAreNull()
    {
        Assert.Null(AddressValidation.ValidateLengths(new AddressModel()));
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
        address.Town = new string('a', FieldLengthConstants.Town + 1);

        Assert.Equal("Town is too long.", AddressValidation.ValidateLengths(address));
    }

    [Fact]
    public void ValidateLengths_RejectsOverLengthZip()
    {
        var address = ValidAddress();
        address.Zip = new string('a', FieldLengthConstants.Zip + 1);

        Assert.Equal("Zip is too long.", AddressValidation.ValidateLengths(address));
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
        address.Number = new string('a', FieldLengthConstants.Number + 1);

        Assert.Equal("Number is too long.", AddressValidation.ValidateLengths(address));
    }
}
