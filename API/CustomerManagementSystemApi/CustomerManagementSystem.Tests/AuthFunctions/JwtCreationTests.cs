using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
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
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "Success!", MerchantRole.Merchant));
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
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "Success!", MerchantRole.Merchant));
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken);
        var token = new JsonWebTokenHandler().ReadJsonWebToken(result.Data!.AccessToken);

        Assert.IsType<long>(token.GetPayloadValue<object>(JwtRegisteredClaimNames.Iat));
        Assert.Contains(token.Claims, c => c.Type == "role" && c.Value == "1801");
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_PassesOnTheDbRejection_WhenCredentialsAreWrong()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(401, "Invalid username or password."));
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
        dbUtils.Verify(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateBearerJwtAsync_LetsADbFailurePropagate_ToTheGlobalExceptionHandler()
    {
        var dbUtils = new Mock<IDbUtils>();
        var failure = new InvalidOperationException("The database is unreachable.");
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);
        var jwtCreation = new JwtCreation(CreateOptions(), dbUtils.Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            jwtCreation.GenerateBearerJwtAsync(Credentials, TestContext.Current.CancellationToken));
        Assert.Same(failure, exception);
    }
}
