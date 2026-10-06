using System.Net;
using CustomerManagementSystem.Tests.AuthFunctions;

namespace CustomerManagementSystem.Tests.Endpoints;

public class AuthenticationEndpointTests
{
    [Fact]
    public async Task PostAccessToken_IssuesATokenThatTheApiThenAccepts()
    {
        await using var api = new ApiHost(signedIn: false);
        api.Db.SetupMerchant("secret");

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
        api.Db.SetupMerchant("secret");

        var response = await api.PostAsync("/api/authentication/access-token",
            new { username = "merchant", password = "wrong" });

        var problem = await ApiHost.ReadProblemAsync(response, HttpStatusCode.Unauthorized);
        Assert.Equal("Invalid username or password.", problem.GetProperty("detail").GetString());
    }
}
