using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.BusinessLogic.Services.Implementation;
using CustomerManagementSystem.DataAccess.DBConnection;
using CustomerManagementSystem.Domain.Configuration;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Services;

public class AuthServiceTests
{
    private static Mock<IAppSettingsConfig> CreateConfig()
    {
        var config = new Mock<IAppSettingsConfig>();
        config.Setup(c => c.SecureJwtKey)
            .Returns("UGxlYXNlIHN0b3JlIHRoaXMgc2VjdXJpdHkga2V5IGluIGEgc2VjdXJlIGVudmlyb25tZW50IQ==");
        config.Setup(c => c.JwtIssuer).Returns("https://localhost:7145/");
        config.Setup(c => c.JwtAudience).Returns("https://localhost:7145/");
        config.Setup(c => c.AccessTokenTimeout).Returns("15");
        return config;
    }

    private static AuthService CreateSut(Mock<IDbUtils> dbUtils) =>
        new(new JwtCreation(CreateConfig().Object, dbUtils.Object));

    [Fact]
    public async Task GetAccessToken_ReturnsAToken_WhenCredentialsAreValid()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<int?>(200, "Success!", 1801));
        var sut = CreateSut(dbUtils);

        var result = await sut.GetAccessToken(new MerchantCredentials
        {
            MerchantId = "TestMerchantID",
            MerchantPassword = "Merchant123",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(200, result.Status);
        Assert.IsType<AccessTokenResponse>(result.Data);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetAccessToken_RejectsMissingMerchantId_WithoutTouchingTheDb(string? merchantId)
    {
        var dbUtils = new Mock<IDbUtils>();
        var sut = CreateSut(dbUtils);

        var result = await sut.GetAccessToken(new MerchantCredentials
        {
            MerchantId = merchantId,
            MerchantPassword = "Merchant123",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(403, result.Status);
        dbUtils.Verify(
            d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // Distinct from JwtCreation's own guard, which only checks MerchantId — AuthService is
    // the one place that also rejects a missing/blank password before any DB call is made.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetAccessToken_RejectsMissingMerchantPassword_WithoutTouchingTheDb(string? merchantPassword)
    {
        var dbUtils = new Mock<IDbUtils>();
        var sut = CreateSut(dbUtils);

        var result = await sut.GetAccessToken(new MerchantCredentials
        {
            MerchantId = "TestMerchantID",
            MerchantPassword = merchantPassword,
        }, TestContext.Current.CancellationToken);

        Assert.Equal(403, result.Status);
        Assert.Equal("Invalid or empty merchant credentials.", result.ResponseMessage);
        dbUtils.Verify(
            d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetAccessToken_PropagatesTheDbRejection_WhenCredentialsAreWrong()
    {
        var dbUtils = new Mock<IDbUtils>();
        dbUtils.Setup(d => d.CheckMerchantCredentialsFromDb(It.IsAny<MerchantCredentials>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<int?>(403, "Invalid Merchant ID or Password."));
        var sut = CreateSut(dbUtils);

        var result = await sut.GetAccessToken(new MerchantCredentials
        {
            MerchantId = "TestMerchantID",
            MerchantPassword = "WrongPassword",
        }, TestContext.Current.CancellationToken);

        Assert.Equal(403, result.Status);
        Assert.Equal("Invalid Merchant ID or Password.", result.ResponseMessage);
    }
}
