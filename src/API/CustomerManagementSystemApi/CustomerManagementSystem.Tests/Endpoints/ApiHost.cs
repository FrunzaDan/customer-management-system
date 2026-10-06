using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using CustomerManagementSystem.BusinessLogic.Abstractions;
using CustomerManagementSystem.BusinessLogic.AuthFunctions;
using CustomerManagementSystem.Domain.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Moq;

namespace CustomerManagementSystem.Tests.Endpoints;

// The real API with only the SQL layer (IDbUtils) faked: a request runs through the route, model binding,
// controller, service and business logic exactly as one from the UI does.
internal sealed class ApiHost : IAsyncDisposable
{
    public const string Username = "TestMerchant";
    private const string SigningKey = "test-signing-key-that-is-at-least-32-bytes-long";
    private const string Issuer = "test-issuer";
    private const string Audience = "test-audience";

    private readonly WebApplicationFactory<Program> _factory;

    public ApiHost(bool signedIn = true)
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Auth:SecureJwtKey", SigningKey);
            builder.UseSetting("Auth:JwtIssuer", Issuer);
            builder.UseSetting("Auth:JwtAudience", Audience);
            builder.ConfigureTestServices(services => services.AddSingleton(Db.Object));
        });
        // HTTPS from the start: following the HTTP-to-HTTPS redirect would drop the Authorization header.
        Client = _factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        if (signedIn)
            Client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken());
    }

    public Mock<IDbUtils> Db { get; } = new();

    public HttpClient Client { get; }

    private static CancellationToken Token => TestContext.Current.CancellationToken;

    public Task<HttpResponseMessage> GetAsync(string url) => Client.GetAsync(url, Token);

    public Task<HttpResponseMessage> DeleteAsync(string url) => Client.DeleteAsync(url, Token);

    public Task<HttpResponseMessage> PatchAsync(string url, object? body = null) =>
        Client.PatchAsync(url, body is null ? null : JsonContent.Create(body), Token);

    public Task<HttpResponseMessage> PostAsync(string url, object? body = null) =>
        Client.PostAsync(url, body is null ? null : JsonContent.Create(body), Token);

    // The ResponseModel envelope of a successful call, as the UI reads it.
    public static async Task<JsonElement> ReadEnvelopeAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.Content.ReadFromJsonAsync<JsonElement>(Token);
        Assert.Equal(200, envelope.GetProperty("status").GetInt32());
        return envelope;
    }

    // The Problem Details body of a failed call.
    public static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>(Token);
    }

    // The audit entry is written once, by the signed-in user.
    public void VerifyAudit(Guid customerId, AuditAction action, string details) =>
        Db.Verify(d => d.LogCustomerAuditAsync(customerId, Username, action, details, It.IsAny<CancellationToken>()),
            Times.Once);

    public void VerifyAudit(Guid customerId, AuditAction action) =>
        Db.Verify(d => d.LogCustomerAuditAsync(customerId, Username, action, It.IsAny<string?>(),
            It.IsAny<CancellationToken>()), Times.Once);

    private static string CreateToken() =>
        new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, Username),
                new Claim(JwtRegisteredClaimNames.UniqueName, Username),
                new Claim("role", ((short)MerchantRole.Merchant).ToString(CultureInfo.InvariantCulture))
            ]),
            Expires = DateTime.UtcNow.AddMinutes(5),
            SigningCredentials = new SigningCredentials(JwtSigningKey.Create(SigningKey),
                SecurityAlgorithms.HmacSha256Signature),
            Issuer = Issuer,
            Audience = Audience
        });

    public ValueTask DisposeAsync()
    {
        Client.Dispose();
        return _factory.DisposeAsync();
    }
}
