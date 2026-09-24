using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Moq;

namespace CustomerManagementSystem.Tests.AuthFunctions;

public class JwtCreationTests
{
    private static Mock<IAppSettingsConfig> CreateConfig(string accessTokenTimeout = "15")
    {
        var config = new Mock<IAppSettingsConfig>();
        config.Setup(c => c.SecureJwtKey)
            .Returns("UGxlYXNlIHN0b3JlIHRoaXMgc2VjdXJpdHkga2V5IGluIGEgc2VjdXJlIGVudmlyb25tZW50IQ==");
        config.Setup(c => c.JwtIssuer).Returns("https://localhost:7145/");
        config.Setup(c => c.JwtAudience).Returns("https://localhost:7145/");
        config.Setup(c => c.AccessTokenTimeout).Returns(accessTokenTimeout);
        return config;
    }

    private static MerchantCredentials Credentials => new()
    {
        Username = "TestMerchant",
        Password = "Merchant123",
    };

    [Fact]
    public async Task GenerateBearerJwt_ReturnsAToken_WhenCredentialsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "Success!", MerchantRole.Merchant));
        var jwtCreation = new JwtCreation(CreateConfig().Object, dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwt(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        var data = Assert.IsType<AccessTokenResponse>(result.Data);
        Assert.Equal(DateTimeKind.Utc, data.ExpiresAt.Kind);
        Assert.False(string.IsNullOrWhiteSpace(data.AccessToken));
        Assert.True(data.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task GenerateBearerJwt_WritesIatAsANumericDate_AndTheRoleAsItsNumericCode()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "Success!", MerchantRole.Merchant));
        var jwtCreation = new JwtCreation(CreateConfig().Object, dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwt(Credentials, TestContext.Current.CancellationToken);
        var token = new JsonWebTokenHandler().ReadJsonWebToken(result.Data!.AccessToken);

        // RFC 7519: iat is seconds since the Unix epoch (a JSON number), not a date string.
        Assert.IsType<long>(token.GetPayloadValue<object>(JwtRegisteredClaimNames.Iat));
        // [Authorize(Roles = "1801")] matches on the code, not the enum member's name.
        Assert.Contains(token.Claims, c => c.Type == "role" && c.Value == "1801");
    }

    [Fact]
    public async Task GenerateBearerJwt_PassesOnTheDbRejection_WhenCredentialsAreWrong()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(401, "Invalid username or password."));
        var jwtCreation = new JwtCreation(CreateConfig().Object, dbUtils.Object);

        var result = await jwtCreation.GenerateBearerJwt(Credentials, TestContext.Current.CancellationToken);

        Assert.Equal(401, result.Status);
        Assert.Equal("Invalid username or password.", result.ResponseMessage);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GenerateBearerJwt_ReturnsBadRequest_WithoutTouchingTheDb_WhenUsernameIsMissing(string? username)
    {
        var dbUtils = new Mock<IDbUtils>();
        var jwtCreation = new JwtCreation(CreateConfig().Object, dbUtils.Object);
        var credentials = new MerchantCredentials { Username = username, Password = "Merchant123" };

        var result = await jwtCreation.GenerateBearerJwt(credentials, TestContext.Current.CancellationToken);

        Assert.Equal(400, result.Status);
        dbUtils.Verify(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateBearerJwt_Throws_WhenAccessTokenTimeoutIsNotConfiguredAsANumber()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "Success!", MerchantRole.Merchant));
        var jwtCreation = new JwtCreation(CreateConfig(accessTokenTimeout: "not-a-number").Object, dbUtils.Object);

        // A misconfigured server, not a client error: it throws, and GlobalExceptionHandler logs it
        // and answers 500 (without the message outside Development — see ErrorResponseTests).
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            jwtCreation.GenerateBearerJwt(Credentials, TestContext.Current.CancellationToken));
        Assert.Equal("Invalid Auth:AccessTokenTimeout configuration.", exception.Message);
    }

    [Fact]
    public async Task GenerateBearerJwt_LetsADbFailurePropagate_ToTheGlobalExceptionHandler()
    {
        var dbUtils = new Mock<IDbUtils>();
        var failure = new InvalidOperationException("Connection string 'CustomerManagementSystemDB_Docker' is unreachable.");
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);
        var jwtCreation = new JwtCreation(CreateConfig().Object, dbUtils.Object);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            jwtCreation.GenerateBearerJwt(Credentials, TestContext.Current.CancellationToken));
        Assert.Same(failure, exception);
    }
}
