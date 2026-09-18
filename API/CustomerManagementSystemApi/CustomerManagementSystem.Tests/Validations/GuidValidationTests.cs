using CustomerManagementSystem.BusinessLogic.Validations;

namespace CustomerManagementSystem.Tests.Validations;

public class GuidValidationTests
{
    [Theory]
    [InlineData("3fa85f64-5717-4562-b3fc-2c963f66afa6")]
    [InlineData("{3fa85f64-5717-4562-b3fc-2c963f66afa6}")]
    [InlineData("3FA85F64-5717-4562-B3FC-2C963F66AFA6")]
    public void ValidateGuid_AcceptsWellFormedGuids(string guid)
    {
        Assert.True(GuidValidation.ValidateGuid(guid));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-a-guid")]
    [InlineData("3fa85f64-5717-4562-b3fc")]
    [InlineData("3fa85f64571745 62b3fc2c963f66afa6")]
    public void ValidateGuid_RejectsMalformedGuids(string? guid)
    {
        Assert.False(GuidValidation.ValidateGuid(guid!));
    }
}
