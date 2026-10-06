using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.Configuration;
using CustomerManagementSystem.BusinessLogic.Contracts;
using CustomerManagementSystem.BusinessLogic.Features.Auth;
using Microsoft.Extensions.Options;
using Moq;

namespace CustomerManagementSystem.Tests.Features.Auth;

public class GetAccessTokenHandlerTests
{
    private static IOptions<AuthOptions> CreateOptions() => Options.Create(new AuthOptions
    {
        SecureJwtKey = "UGxlYXNlIHN0b3JlIHRoaXMgc2VjdXJpdHkga2V5IGluIGEgc2VjdXJlIGVudmlyb25tZW50IQ==",
        JwtIssuer = "https://localhost:7145/",
        JwtAudience = "https://localhost:7145/",
        AccessTokenTimeoutMinutes = 15
    });

    private static GetAccessTokenHandler CreateSut(Mock<IMerchantRepository> merchants) =>
        new(new JwtCreation(CreateOptions(), merchants.Object));

    [Fact]
    public async Task HandleAsync_ReturnsAToken_WhenCredentialsAreValid()
    {
        var merchants = new Mock<IMerchantRepository>();
        merchants.SetupMerchant("Merchant123");
        var sut = CreateSut(merchants);

        var result = await sut.HandleAsync(new MerchantCredentials
        {
            Username = "TestMerchant",
            Password = "Merchant123",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.IsType<AccessTokenResponse>(result.Data);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_RejectsMissingUsername_WithoutTouchingTheDb(string? username)
    {
        var merchants = new Mock<IMerchantRepository>();
        var sut = CreateSut(merchants);

        var result = await sut.HandleAsync(new MerchantCredentials
        {
            Username = username,
            Password = "Merchant123",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        merchants.Verify(
            d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task HandleAsync_RejectsMissingPassword_WithoutTouchingTheDb(string? password)
    {
        var merchants = new Mock<IMerchantRepository>();
        var sut = CreateSut(merchants);

        var result = await sut.HandleAsync(new MerchantCredentials
        {
            Username = "TestMerchant",
            Password = password,
        }, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        Assert.Equal("Username and password are required.", result.ResponseMessage);
        merchants.Verify(
            d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_ReturnsUnauthorized_WhenThePasswordIsWrong()
    {
        var merchants = new Mock<IMerchantRepository>();
        merchants.SetupMerchant("Merchant123");
        var sut = CreateSut(merchants);

        var result = await sut.HandleAsync(new MerchantCredentials
        {
            Username = "TestMerchant",
            Password = "WrongPassword",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(401, result.Status);
        Assert.Equal("Invalid username or password.", result.ResponseMessage);
    }
}
