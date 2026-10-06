using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.BusinessLogic.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Moq;

namespace CustomerManagementSystem.Tests.AuthFunctions;

public class JwtCreationTests
{
    private static IOptions<AuthOptions> CreateOptions() => Options.Create(new AuthOptions
    {
        SecureJwtKey = "UGxlYXNlIHN0b3JlIHRoaXMgc2VjdXJpdHkga2V5IGluIGEgc2VjdXJlIGVudmlyb25tZW50IQ==",
        JwtIssuer = "https://localhost:7145/",
        JwtAudience = "https://localhost:7145/",
        AccessTokenTimeoutMinutes = 15
    });

    private static MerchantCredentials Credentials => new()
    {
        Username = "TestMerchant",
        Password = "Merchant123",
    };

    [Fact]
    public async Task GenerateBearerJwtAsync_ReturnsAToken_WhenCredentialsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.SetupMerchant("Merchant123");
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        var data = Assert.IsType<AccessTokenResponse>(result.Data);
        Assert.Equal(DateTimeKind.Utc, data.ExpiresAt.Kind);
        Assert.False(string.IsNullOrWhiteSpace(data.AccessToken));
        Assert.True(data.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_WritesIatAsANumericDate_AndTheRoleAsItsNumericCode()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.SetupMerchant("Merchant123");
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);
        var token = new JsonWebTokenHandler().ReadJsonWebToken(result.Data!.AccessToken);

        Assert.IsType<long>(token.GetPayloadValue<object>(JwtRegisteredClaimNames.Iat));
        Assert.Contains(token.Claims, c => c.Type == "role" && c.Value == "1801");
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_ReturnsUnauthorized_WhenThePasswordIsWrong()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.SetupMerchant("SomeOtherPassword");
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(401, result.Status);
        Assert.Equal("Invalid username or password.", result.ResponseMessage);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GenerateBearerJwtAsync_ReturnsBadRequest_WithoutTouchingTheDb_WhenUsernameIsMissing(string? username)
    {
        var dbUtils = new Mock<IDbUtils>();
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);
        var credentials = new MerchantCredentials { Username = username, Password = "Merchant123" };

        var result = await jwtCreation.GenerateBearerJwtAsync(credentials, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_LetsADbFailurePropagate_ToTheGlobalExceptionHandler()
    {
        var dbUtils = new Mock<IDbUtils>();
        var failure = new InvalidOperationException("The database is unreachable.");
        dbUtils.Setup(d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken));
        Assert.Same(failure, exception);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_ReturnsUnauthorized_WhenTheUsernameIsUnknown()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.GetMerchantAuthDataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MerchantAuthData?)null);
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(401, result.Status);
        Assert.Equal("Invalid username or password.", result.ResponseMessage);
        dbUtils.Verify(d => d.RecordMerchantLoginAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_ReturnsForbidden_WhenTheRoleIsNotMerchant()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.SetupMerchant("Merchant123", role: (MerchantRole)1802);
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(403, result.Status);
        Assert.Equal("The provided merchant role (1802) is not valid.", result.ResponseMessage);
        dbUtils.Verify(d => d.RecordMerchantLoginAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_RecordsTheLogin_OnlyWhenItSucceeds()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.SetupMerchant("Merchant123");
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);

        dbUtils.Verify(d => d.RecordMerchantLoginAsync("TestMerchant", It.IsAny<CancellationToken>()), Times.Once);
    }
}
