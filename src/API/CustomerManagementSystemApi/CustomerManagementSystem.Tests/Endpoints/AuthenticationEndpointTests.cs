using System.Net;
using CustomerManagementSystem.Domain.Models;
using Moq;

namespace CustomerManagementSystem.Tests.Endpoints;

public class AuthenticationEndpointTests
{
    [Fact]
    public async Task PostAccessToken_IssuesATokenThatTheApiThenAccepts()
    {
        await using var api = new ApiHost(signedIn: false);
        api.Db.Setup(d => d.CheckMerchantCredentialsFromDbAsync(
                It.Is<MerchantCredentials>(c => c.Username == "merchant" && c.Password == "secret"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(200, "", MerchantRole.Merchant));

        var login = await api.PostAsync("/api/authentication/access-token",
            new { username = "merchant", password = "secret" });

        var token = (await ApiHost.ReadEnvelopeAsync(login)).GetProperty("data").GetProperty("accessToken").GetString();
        api.Client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        await ApiHost.ReadEnvelopeAsync(await api.GetAsync("/api/authentication/verify-token"));
    }

    [Fact]
    public async Task PostAccessToken_WrongCredentials_IsA401Problem()
    {
        await using var api = new ApiHost(signedIn: false);
        api.Db.Setup(d => d.CheckMerchantCredentialsFromDbAsync(It.IsAny<MerchantCredentials>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResponseModel<MerchantRole?>(401, "Invalid username or password."));

        var response = await api.PostAsync("/api/authentication/access-token",
            new { username = "merchant", password = "wrong" });

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("Invalid username or password.", problem.GetProperty("detail").GetString());
    }
}
